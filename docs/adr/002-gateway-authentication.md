# ADR 002: Centralized Authentication in API Gateway

## Status

Accepted

## Context

The OpenBricks platform consists of multiple microservices (API, Auth, Storage, Query Engine) written in different languages (Node.js, Go, Python).
Initially, authentication was implemented only in the API Service (Node.js) and Auth Service (Go).
The Storage Service (Python) and Query Engine were exposed via the API Gateway without any authentication, creating a security vulnerability.
Implementing JWT validation in every service leads to code duplication and potential inconsistencies.

## Decision

We will implement **Centralized Authentication** in the API Gateway using the "Gateway Offloading" pattern.

1.  **Gateway Middleware**: The API Gateway (Node.js) will validate JWT tokens for all protected routes (`/api/v1`, `/api/storage`, `/api/query`).
2.  **Token Verification**: The Gateway will verify tokens locally using the shared `JWT_SECRET` for performance (avoiding an internal HTTP call per request).
3.  **Context Propagation**: Upon successful verification, the Gateway will inject user context into request headers (`X-User-Id`, `X-User-Email`, `X-User-Role`) before forwarding to downstream services.
4.  **Downstream Trust**: Downstream services can trust these headers (assuming internal network security) or verify the token again for defense-in-depth.
5.  **Optimization**: The API Service is updated to prefer the injected headers over re-verifying the token, reducing latency.

## Consequences

### Positive

- **Security**: All services are protected by default. No service is accidentally exposed.
- **Performance**: Token verification happens once at the edge. Downstream services are relieved of this burden.
- **Simplicity**: Python/Go services don't need complex auth middleware, just header parsing.
- **Consistency**: Single point of policy enforcement.

### Negative

- **Coupling**: Gateway and Auth Service must share the `JWT_SECRET`.
- **Security Risk**: If the internal network is compromised, an attacker could spoof `X-User-Id` headers. (Mitigation: Network policies, mTLS, or re-verification in critical services).

## Implementation Details

- `services/api-gateway/src/middleware/auth.js`: Implements JWT verification.
- `services/api-gateway/src/index.js`: Applies middleware to routes.
- `services/api/src/middleware/auth.js`: Updated to use `X-User-Id` header.
