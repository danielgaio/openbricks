const { authenticateToken } = require("../auth");
const jwt = require("jsonwebtoken");

jest.mock("jsonwebtoken");

describe("Gateway Auth Middleware", () => {
  let req, res, next;
  const JWT_SECRET =
    process.env.JWT_SECRET || "your-super-secret-jwt-key-change-me";

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should return 401 if no token is provided", () => {
    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Access token required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if token is invalid", () => {
    req.headers["authorization"] = "Bearer invalid-token";
    jwt.verify.mockImplementation((token, secret, cb) =>
      cb(new Error("Invalid token"), null)
    );

    authenticateToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid or expired token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next and attach headers if token is valid", () => {
    const user = { user_id: 1, email: "test@example.com", role: "user" };
    req.headers["authorization"] = "Bearer valid-token";
    jwt.verify.mockImplementation((token, secret, cb) => cb(null, user));

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(user);
    expect(req.headers["X-User-Id"]).toBe(1);
    expect(req.headers["X-User-Email"]).toBe("test@example.com");
    expect(req.headers["X-User-Role"]).toBe("user");
  });
});
