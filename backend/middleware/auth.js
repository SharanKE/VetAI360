const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { withUserId } = require("../utils/id");

async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = withUserId(await Promise.resolve(User.findById(payload.id)));
    if (!user) {
      return res.status(401).json({ error: "Account no longer exists." });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to do that." });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
