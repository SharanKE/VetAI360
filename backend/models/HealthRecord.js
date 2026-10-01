if (process.env.DB_TYPE === 'mongo') {
  module.exports = require('./mongo/HealthRecord');
  return;
}

const db = require("../config/db");

const HealthRecord = {
  create({ animalId, vetId, diagnosis, treatment, notes, source, confidence }) {
    const info = db
      .prepare(
        `INSERT INTO health_records (animal_id, vet_id, diagnosis, treatment, notes, source, confidence)
         VALUES (@animalId, @vetId, @diagnosis, @treatment, @notes, @source, @confidence)`
      )
      .run({
        animalId,
        vetId: vetId || null,
        diagnosis,
        treatment: treatment || null,
        notes: notes || null,
        source: source || "manual",
        confidence: confidence || null,
      });
    return db.prepare("SELECT * FROM health_records WHERE id = ?").get(info.lastInsertRowid);
  },

  listByAnimal(animalId) {
    return db
      .prepare(
        `SELECT health_records.*, users.name AS vet_name
         FROM health_records LEFT JOIN users ON users.id = health_records.vet_id
         WHERE animal_id = ? ORDER BY record_date DESC`
      )
      .all(animalId);
  },
};

module.exports = HealthRecord;
