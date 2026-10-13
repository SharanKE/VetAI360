const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");
const { toId } = require("../utils/id");

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: toId(user.id ?? user._id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, phone, specialty, language } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Name, email, password, and role are required." });
    }

    // Validate real email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    if (!["farmer", "vet"].includes(role)) {
      return res.status(400).json({ error: "Role must be 'farmer' or 'vet'. Admin accounts are created separately." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    if (await User.findByEmail(email)) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const user = await User.create({ name, email, passwordHash, role, phone, specialty, language });
    const token = signToken(user);

    res.status(201).json({
      token,
      user: User.publicView(user),
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: err.message || "Registration failed." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const user = await User.findByEmail(cleanEmail);
    if (!user || !bcrypt.compareSync(cleanPassword, user.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(user);
    res.json({ token, user: User.publicView(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message || "Login failed." });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { credential, email, name, role = "farmer", phone, language } = req.body;

    let userEmail = email ? String(email).trim().toLowerCase() : null;
    let userName = name ? String(name).trim() : null;

    // If Google ID token is provided, verify via Google tokeninfo
    if (credential) {
      try {
        const fetch = require("node-fetch");
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        if (verifyRes.ok) {
          const payload = await verifyRes.json();
          if (payload.email) {
            userEmail = payload.email.toLowerCase();
            userName = payload.name || userName || userEmail.split("@")[0];
          }
        }
      } catch (err) {
        console.warn("Google tokeninfo verification error, falling back to body:", err.message);
      }
    }

    if (!userEmail) {
      return res.status(400).json({ error: "Google email is required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({ error: "Invalid Google email address." });
    }

    let user = await User.findByEmail(userEmail);
    if (!user) {
      const crypto = require("crypto");
      const safeRole = ["farmer", "vet"].includes(role) ? role : "farmer";
      const randomPassword = crypto.randomBytes(16).toString("hex");
      const passwordHash = bcrypt.hashSync(randomPassword, 10);
      user = await User.create({
        name: userName || userEmail.split("@")[0],
        email: userEmail,
        passwordHash,
        role: safeRole,
        phone: phone || null,
        language: language || "en",
      });
    }

    const token = signToken(user);
    res.json({ token, user: User.publicView(user) });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(500).json({ error: err.message || "Google authentication failed." });
  }
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: User.publicView(req.user) });
});

module.exports = router;
