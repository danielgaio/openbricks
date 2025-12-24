// OpenBricks Auth Service
// JWT-based authentication and RBAC service

package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB
var jwtSecret []byte

type User struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	Name      string    `json:"name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type TokenResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
	User      User      `json:"user"`
}

type Claims struct {
	UserID int    `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func main() {
	// Initialize database connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://openbricks:openbricks@localhost:5432/openbricks?sslmode=disable"
	}

	var err error
	db, err = sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize JWT secret
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "your-super-secret-jwt-key-change-me"
	}
	jwtSecret = []byte(secret)

	// Set up routes
	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/api/auth/login", loginHandler)
	http.HandleFunc("/api/auth/register", registerHandler)
	http.HandleFunc("/api/auth/verify", verifyHandler)
	http.HandleFunc("/api/auth/refresh", refreshHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8001"
	}

	log.Printf("OpenBricks Auth Service starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	err := db.Ping()
	if err != nil {
		http.Error(w, `{"status":"unhealthy","error":"database connection failed"}`, http.StatusServiceUnavailable)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"service":   "openbricks-auth",
		"version":   "0.1.0",
	})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Find user
	var user User
	err := db.QueryRow(
		"SELECT id, email, password, name, role, created_at FROM users WHERE email = $1",
		req.Email,
	).Scan(&user.ID, &user.Email, &user.Password, &user.Name, &user.Role, &user.CreatedAt)

	if err == sql.ErrNoRows {
		http.Error(w, `{"error":"invalid credentials"}`, http.StatusUnauthorized)
		return
	} else if err != nil {
		log.Printf("Database error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		http.Error(w, `{"error":"invalid credentials"}`, http.StatusUnauthorized)
		return
	}

	// Generate token
	token, expiresAt, err := generateToken(user)
	if err != nil {
		log.Printf("Token generation error: %v", err)
		http.Error(w, `{"error":"failed to generate token"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(TokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		User:      user,
	})
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	// Validate input
	if req.Email == "" || req.Password == "" || req.Name == "" {
		http.Error(w, `{"error":"email, password, and name are required"}`, http.StatusBadRequest)
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Password hashing error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	// Create user
	var user User
	err = db.QueryRow(
		"INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role, created_at",
		req.Email, string(hashedPassword), req.Name, "user",
	).Scan(&user.ID, &user.Email, &user.Name, &user.Role, &user.CreatedAt)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			http.Error(w, `{"error":"email already exists"}`, http.StatusConflict)
			return
		}
		log.Printf("Database error: %v", err)
		http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
		return
	}

	// Generate token
	token, expiresAt, err := generateToken(user)
	if err != nil {
		log.Printf("Token generation error: %v", err)
		http.Error(w, `{"error":"failed to generate token"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(TokenResponse{
		Token:     token,
		ExpiresAt: expiresAt,
		User:      user,
	})
}

func verifyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Extract token from Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, `{"error":"authorization header required"}`, http.StatusUnauthorized)
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		http.Error(w, `{"error":"invalid authorization header format"}`, http.StatusUnauthorized)
		return
	}

	// Parse and validate token
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"valid":   true,
		"user_id": claims.UserID,
		"email":   claims.Email,
		"role":    claims.Role,
	})
}

func refreshHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Extract token from Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, `{"error":"authorization header required"}`, http.StatusUnauthorized)
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
		return
	}

	// Get fresh user data
	var user User
	err = db.QueryRow(
		"SELECT id, email, name, role, created_at FROM users WHERE id = $1",
		claims.UserID,
	).Scan(&user.ID, &user.Email, &user.Name, &user.Role, &user.CreatedAt)

	if err != nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusUnauthorized)
		return
	}

	// Generate new token
	newToken, expiresAt, err := generateToken(user)
	if err != nil {
		http.Error(w, `{"error":"failed to generate token"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(TokenResponse{
		Token:     newToken,
		ExpiresAt: expiresAt,
		User:      user,
	})
}

func generateToken(user User) (string, time.Time, error) {
	expiryStr := os.Getenv("JWT_EXPIRY")
	if expiryStr == "" {
		expiryStr = "24h"
	}

	expiry, err := time.ParseDuration(expiryStr)
	if err != nil {
		expiry = 24 * time.Hour
	}

	expiresAt := time.Now().Add(expiry)

	claims := &Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "openbricks-auth",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expiresAt, nil
}
