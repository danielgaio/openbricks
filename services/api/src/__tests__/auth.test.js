/**
 * Authentication Middleware Tests
 * Comprehensive test suite for JWT authentication middleware
 */

const request = require("supertest");
const express = require("express");
const {
  authenticateToken,
  requireRole,
  optionalAuth,
} = require("../middleware/auth");

// Mock auth service
jest.mock("axios");
const axios = require("axios");

describe("Authentication Middleware", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();
  });

  describe("authenticateToken", () => {
    it("should reject requests without token", async () => {
      app.get("/protected", authenticateToken, (req, res) => {
        res.json({ message: "success" });
      });

      const response = await request(app).get("/protected").expect(401);

      expect(response.body.error).toBe("Authentication required");
    });

    it("should reject requests with invalid token", async () => {
      axios.post.mockRejectedValue({
        response: { status: 401 },
      });

      app.get("/protected", authenticateToken, (req, res) => {
        res.json({ message: "success" });
      });

      const response = await request(app)
        .get("/protected")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.error).toBe("Invalid token");
    });

    it("should allow requests with valid token", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        role: "user",
      };

      axios.post.mockResolvedValue({
        data: { user: mockUser },
      });

      app.get("/protected", authenticateToken, (req, res) => {
        res.json({ user: req.user });
      });

      const response = await request(app)
        .get("/protected")
        .set("Authorization", "Bearer valid-token")
        .expect(200);

      expect(response.body.user).toEqual(mockUser);
    });

    it("should handle auth service errors gracefully", async () => {
      axios.post.mockRejectedValue(new Error("Network error"));

      app.get("/protected", authenticateToken, (req, res) => {
        res.json({ message: "success" });
      });

      const response = await request(app)
        .get("/protected")
        .set("Authorization", "Bearer some-token")
        .expect(500);

      expect(response.body.error).toBe("Authentication service error");
    });
  });

  describe("requireRole", () => {
    beforeEach(() => {
      // Mock authenticateToken to set req.user
      app.use((req, res, next) => {
        if (req.headers.authorization) {
          req.user = {
            id: 1,
            email: "test@example.com",
            role: req.headers["x-test-role"] || "user",
          };
        }
        next();
      });
    });

    it("should allow access for users with correct role", async () => {
      app.get("/admin", requireRole("admin"), (req, res) => {
        res.json({ message: "admin access granted" });
      });

      const response = await request(app)
        .get("/admin")
        .set("Authorization", "Bearer token")
        .set("x-test-role", "admin")
        .expect(200);

      expect(response.body.message).toBe("admin access granted");
    });

    it("should deny access for users without correct role", async () => {
      app.get("/admin", requireRole("admin"), (req, res) => {
        res.json({ message: "admin access granted" });
      });

      const response = await request(app)
        .get("/admin")
        .set("Authorization", "Bearer token")
        .set("x-test-role", "user")
        .expect(403);

      expect(response.body.error).toBe("Insufficient permissions");
    });

    it("should support multiple allowed roles", async () => {
      app.get("/staff", requireRole("admin", "moderator"), (req, res) => {
        res.json({ message: "staff access granted" });
      });

      // Test admin access
      await request(app)
        .get("/staff")
        .set("Authorization", "Bearer token")
        .set("x-test-role", "admin")
        .expect(200);

      // Test moderator access
      await request(app)
        .get("/staff")
        .set("Authorization", "Bearer token")
        .set("x-test-role", "moderator")
        .expect(200);

      // Test user denied
      await request(app)
        .get("/staff")
        .set("Authorization", "Bearer token")
        .set("x-test-role", "user")
        .expect(403);
    });

    it("should fail if user is not authenticated", async () => {
      app.get("/admin", requireRole("admin"), (req, res) => {
        res.json({ message: "admin access granted" });
      });

      const response = await request(app).get("/admin").expect(401);

      expect(response.body.error).toBe("Authentication required");
    });
  });

  describe("optionalAuth", () => {
    it("should allow requests without token", async () => {
      app.get("/public", optionalAuth, (req, res) => {
        res.json({
          authenticated: !!req.user,
          user: req.user,
        });
      });

      const response = await request(app).get("/public").expect(200);

      expect(response.body.authenticated).toBe(false);
      expect(response.body.user).toBeNull();
    });

    it("should attach user if valid token provided", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        role: "user",
      };

      axios.post.mockResolvedValue({
        data: { user: mockUser },
      });

      app.get("/public", optionalAuth, (req, res) => {
        res.json({
          authenticated: !!req.user,
          user: req.user,
        });
      });

      const response = await request(app)
        .get("/public")
        .set("Authorization", "Bearer valid-token")
        .expect(200);

      expect(response.body.authenticated).toBe(true);
      expect(response.body.user).toEqual(mockUser);
    });

    it("should not fail on invalid token", async () => {
      axios.post.mockRejectedValue({
        response: { status: 401 },
      });

      app.get("/public", optionalAuth, (req, res) => {
        res.json({
          authenticated: !!req.user,
          user: req.user,
        });
      });

      const response = await request(app)
        .get("/public")
        .set("Authorization", "Bearer invalid-token")
        .expect(200);

      expect(response.body.authenticated).toBe(false);
      expect(response.body.user).toBeNull();
    });
  });
});
