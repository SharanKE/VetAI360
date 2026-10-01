if (process.env.DB_TYPE === 'mongo') {
  module.exports = require('./mongo/User');
  return;
}

const db = require("../config/db");

const User = {
  create({ name, email, passwordHash, role, phone, specialty, language }) {
    const verified = 1; // registered users and vets are immediately active
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, phone, specialty, verified, language)
      VALUES (@name, @email, @passwordHash, @role, @phone, @specialty, @verified, @language)
    `);
    const info = stmt.run({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      phone: phone || null,
      specialty: specialty || null,
      verified,
      language: language || "en",
    });
    return User.findById(info.lastInsertRowid);
  },

  findByEmail(email) {
    return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
  },

  findById(id) {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  },

  publicView(user) {
    if (!user) return null;
    const { password_hash, ...rest } = user;
    return rest;
  },

  listByRole(role) {
    return db.prepare("SELECT * FROM users WHERE role = ? ORDER BY created_at DESC").all(role);
  },

  listAll() {
    return db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
  },

  setVerified(id, verified) {
    db.prepare("UPDATE users SET verified = ? WHERE id = ?").run(verified ? 1 : 0, id);
    return User.findById(id);
  },

  listVerifiedVets() {
    return db.prepare("SELECT * FROM users WHERE role = 'vet' AND verified = 1 ORDER BY name").all();
  },
};

module.exports = User;
