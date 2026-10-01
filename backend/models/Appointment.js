if (process.env.DB_TYPE === 'mongo') {
  module.exports = require('./mongo/Appointment');
  return;
}

const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const Appointment = {
  create({ farmerId, vetId, animalId, reason, scheduledTime }) {
    const meetingRoom = `vetai360-${uuidv4().slice(0, 8)}`;
    const info = db
      .prepare(
        `INSERT INTO appointments (farmer_id, vet_id, animal_id, reason, scheduled_time, meeting_room)
         VALUES (@farmerId, @vetId, @animalId, @reason, @scheduledTime, @meetingRoom)`
      )
      .run({ farmerId, vetId, animalId: animalId || null, reason: reason || null, scheduledTime, meetingRoom });
    return Appointment.findById(info.lastInsertRowid);
  },

  findById(id) {
    return db
      .prepare(
        `SELECT appointments.*, f.name AS farmer_name, v.name AS vet_name, a.name AS animal_name
         FROM appointments
         JOIN users f ON f.id = appointments.farmer_id
         JOIN users v ON v.id = appointments.vet_id
         LEFT JOIN animals a ON a.id = appointments.animal_id
         WHERE appointments.id = ?`
      )
      .get(id);
  },

  listForUser(userId, role) {
    const column = role === "vet" ? "vet_id" : "farmer_id";
    return db
      .prepare(
        `SELECT appointments.*, f.name AS farmer_name, v.name AS vet_name, a.name AS animal_name
         FROM appointments
         JOIN users f ON f.id = appointments.farmer_id
         JOIN users v ON v.id = appointments.vet_id
         LEFT JOIN animals a ON a.id = appointments.animal_id
         WHERE appointments.${column} = ?
         ORDER BY scheduled_time DESC`
      )
      .all(userId);
  },

  updateStatus(id, status) {
    db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, id);
    return Appointment.findById(id);
  },
};

module.exports = Appointment;
