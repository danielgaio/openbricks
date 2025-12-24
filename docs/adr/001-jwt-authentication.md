# ADR-001: JWT-based Authentication

## Status

**Accepted** - December 2024

## Context

OpenBricks requires a robust authentication mechanism that:

1. **Scales horizontally** - Must work across multiple service instances without shared state
2. **Supports microservices** - Auth decisions need to be made at multiple services
3. **Minimizes latency** - Authentication checks happen on every API request
4. **Enables fine-grained authorization** - Role-based access control (RBAC) needed
5. **Maintains security** - Must protect against common attacks (replay, CSRF, XSS)

### Considered Alternatives

#### 1. Session-based Authentication (Cookies + Server-side Sessions)

**Pros:**

- Familiar pattern
- Easy server-side invalidation
- No token expiration needed

**Cons:**

- Requires shared session store (Redis) for horizontal scaling
- CSRF vulnerabilities require additional protection
- Sticky sessions or session replication adds complexity
- Not ideal for microservices (service-to-service auth difficult)

#### 2. OAuth 2.0 with External Provider

**Pros:**

- Offloads authentication complexity
- Trusted providers (Google, GitHub, etc.)
- SSO capabilities

**Cons:**

- Vendor lock-in
- Requires internet connectivity
- Less control over user experience
- Still need JWT or similar for API authorization

#### 3. JWT (JSON Web Tokens)

**Pros:**

- Stateless - no server-side storage needed
- Self-contained - includes claims (user ID, role, permissions)
- Industry standard (RFC 7519)
- Works across microservices
- Horizontal scaling without coordination
- Works with both cookies and Authorization headers

**Cons:**

- Cannot be revoked before expiration (mitigated with short expiry + refresh tokens)
- Token size larger than session IDs
- Requires proper secret management
- Clock synchronization needed for expiry checks

## Decision

**We will use JWT-based authentication with the following design:**

### Token Strategy

1. **Access Tokens (Short-lived)**

   - Expiry: 15 minutes (configurable)
   - Purpose: API authentication
   - Storage: Memory only (React state/context)
   - Claims: `user_id`, `email`, `role`, `exp`, `iat`

2. **Refresh Tokens (Long-lived)**
   - Expiry: 7 days (configurable)
   - Purpose: Obtaining new access tokens
   - Storage: HttpOnly cookie (CSRF-safe)
   - Additional security: Rotation on use, family detection

### Architecture

```
┌─────────┐        1. Login       ┌──────────────┐
│ Client  │ ───────────────────> │ Auth Service │
│         │                        │   (Go)       │
│         │ <─────────────────── │              │
└─────────┘   2. Access Token +   └──────────────┘
              Refresh Token               │
                                         │ Verify user
                                         ▼
                                  ┌──────────────┐
                                  │  PostgreSQL  │
                                  └──────────────┘

┌─────────┐   3. API Request     ┌──────────────┐
│ Client  │   (Bearer Token)     │ API Gateway  │
│         │ ───────────────────> │              │
│         │                        │              │
│         │                        └──────────────┘
│         │                               │
│         │                               ▼
│         │                        ┌──────────────┐   4. Verify Token
│         │                        │ Auth Service │   (JWT signature)
│         │                        │              │
│         │ <─────────────────── └──────────────┘
└─────────┘   5. Response                │
              (if valid)                 │
                                         ▼
                                  Decode claims
                                  (user_id, role)
```

### Implementation Details

#### Token Generation (Auth Service - Go)

```go
claims := Claims{
    UserID: user.ID,
    Email:  user.Email,
    Role:   user.Role,
    RegisteredClaims: jwt.RegisteredClaims{
        ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
        IssuedAt:  jwt.NewNumericDate(time.Now()),
        Issuer:    "openbricks-auth",
    },
}
token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
signedToken, _ := token.SignedString(jwtSecret)
```

#### Token Verification (API Services - Node.js)

```javascript
// Middleware verifies via auth service
const response = await axios.post(
  `${AUTH_SERVICE_URL}/api/auth/verify`,
  {},
  { headers: { Authorization: `Bearer ${token}` } }
);
req.user = response.data.user;
```

### Security Measures

1. **Signing Algorithm**: HMAC-SHA256 (symmetric)

   - Single secret shared by auth service
   - Fast verification
   - Suitable for trusted microservices

2. **Token Storage**:

   - **Access tokens**: Memory only (not localStorage - XSS risk)
   - **Refresh tokens**: HttpOnly cookies (not accessible via JavaScript)

3. **Transmission**: Always over HTTPS in production

4. **Secret Management**:

   - Environment variables in development
   - Secret managers in production (AWS Secrets Manager, Vault)
   - Minimum 256-bit entropy

5. **Refresh Token Rotation**:

   - New refresh token issued on each use
   - Old token invalidated
   - Family tracking to detect theft

6. **Rate Limiting**:
   - Auth endpoints: 10 requests per 15 minutes per IP
   - API endpoints: 100 requests per 15 minutes per IP

### Authorization (RBAC)

JWT claims include `role` field:

- `admin`: Full platform access
- `user`: Standard user access
- `viewer`: Read-only access

Enforcement via middleware:

```javascript
app.get(
  "/admin/users",
  authenticateToken,
  requireRole("admin"),
  getUsersHandler
);
```

## Consequences

### Positive

1. **Horizontal Scalability**: No shared state needed, any service instance can verify tokens
2. **Low Latency**: In-memory verification (no database lookup per request)
3. **Microservice-Friendly**: Services independently verify tokens
4. **Standard Protocol**: Well-understood, many libraries available
5. **Future-Proof**: Easy to add SSO/OAuth later (JWT as authorization layer)

### Negative

1. **Cannot Revoke Early**: Compromised tokens valid until expiry
   - **Mitigation**: Short expiry (15 min), refresh token rotation
2. **Token Size**: ~500 bytes vs ~32 bytes for session ID

   - **Mitigation**: Acceptable for API-heavy workload, gzip compression

3. **Clock Synchronization**: Services need synchronized clocks

   - **Mitigation**: NTP in production, 5-minute expiry grace period

4. **Secret Management**: Critical to protect JWT secret
   - **Mitigation**: Secrets manager, rotation policy, audit logging

### Risks & Mitigations

| Risk                | Likelihood | Impact | Mitigation                                   |
| ------------------- | ---------- | ------ | -------------------------------------------- |
| JWT secret exposure | Low        | High   | Secrets manager, no git commits, rotation    |
| XSS token theft     | Medium     | High   | Store in memory only, CSP headers            |
| Token replay        | Medium     | Medium | Short expiry, HTTPS only, rate limiting      |
| Refresh token theft | Low        | High   | HttpOnly cookies, rotation, family detection |

## Compliance Considerations

- **GDPR**: User data in tokens minimal (ID, email, role only)
- **PCI DSS**: No payment data in tokens
- **HIPAA**: No PHI in tokens (healthcare use cases)

## Future Enhancements

1. **Asymmetric Keys** (RSA/ECDSA): For token generation in one service, verification in many
2. **Token Versioning**: Force logout by incrementing version
3. **Scopes/Permissions**: Fine-grained authorization beyond roles
4. **OAuth 2.0 Integration**: For third-party app access
5. **Multi-factor Authentication**: TOTP support

## References

- [RFC 7519 - JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [JWT.io](https://jwt.io/) - Token debugger
- [Auth0 JWT Handbook](https://auth0.com/resources/ebooks/jwt-handbook)

## Decision Makers

- Architecture Team
- Security Team
- Backend Engineering Team

## Date

December 24, 2024
