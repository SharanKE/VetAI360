if (process.env.DB_TYPE === 'mongo') {
  module.exports = require('./mongo/Prediction');
  return;
}

const db = require("../config/db");

const Prediction = {
  create({ animalId, requestedBy, type, inputSummary, resultLabel, confidence, recommendation }) {
    const info = db
      .prepare(
        `INSERT INTO predictions (animal_id, requested_by, type, input_summary, result_label, confidence, recommendation)
         VALUES (@animalId, @requestedBy, @type, @inputSummary, @resultLabel, @confidence, @recommendation)`
      )
      .run({
        animalId: animalId || null,
        requestedBy,
        type,
        inputSummary: inputSummary || null,
        resultLabel,
        confidence,
        recommendation: recommendation || null,
      });
    return db.prepare("SELECT * FROM predictions WHERE id = ?").get(info.lastInsertRowid);
  },

  listByAnimal(animalId) {
    return db.prepare("SELECT * FROM predictions WHERE animal_id = ? ORDER BY created_at DESC").all(animalId);
  },

  listByUser(userId) {
    return db.prepare("SELECT * FROM predictions WHERE requested_by = ? ORDER BY created_at DESC LIMIT 50").all(userId);
  },
};

module.exports = Prediction;
