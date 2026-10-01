if (process.env.DB_TYPE === 'mongo') {
  module.exports = require('./mongo/Alert');
  return;
}

const db = require("../config/db");

const Alert = {
  create({ animalId, type, severity, message }) {
    const info = db
      .prepare(
        `INSERT INTO alerts (animal_id, type, severity, message) VALUES (@animalId, @type, @severity, @message)`
      )
      .run({ animalId, type, severity, message });
    return db.prepare("SELECT * FROM alerts WHERE id = ?").get(info.lastInsertRowid);
  },

  listByOwner(ownerId) {
    return db
      .prepare(
        `SELECT alerts.*, animals.name AS animal_name, animals.species
         FROM alerts JOIN animals ON animals.id = alerts.animal_id
         WHERE animals.owner_id = ? ORDER BY alerts.created_at DESC`
      )
      .all(ownerId);
  },

  listAll() {
    return db
      .prepare(
        `SELECT alerts.*, animals.name AS animal_name, animals.owner_id
         FROM alerts JOIN animals ON animals.id = alerts.animal_id
         ORDER BY alerts.created_at DESC LIMIT 200`
      )
      .all();
  },

  recentUnresolvedOfType(animalId, type, withinMinutes = 60) {
    return db
      .prepare(
        `SELECT * FROM alerts WHERE animal_id = ? AND type = ? AND resolved = 0
         AND created_at >= datetime('now', '-' || ? || ' minutes')`
      )
      .get(animalId, type, withinMinutes);
  },

  resolve(id) {
    db.prepare("UPDATE alerts SET resolved = 1 WHERE id = ?").run(id);
    return db.prepare("SELECT * FROM alerts WHERE id = ?").get(id);
  },
};

module.exports = Alert;
