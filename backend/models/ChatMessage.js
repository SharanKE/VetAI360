if (process.env.DB_TYPE === 'mongo') {
  module.exports = require('./mongo/ChatMessage');
  return;
}

const db = require("../config/db");

const ChatMessage = {
  create({ appointmentId, senderId, message }) {
    const info = db
      .prepare(
        `INSERT INTO chat_messages (appointment_id, sender_id, message) VALUES (@appointmentId, @senderId, @message)`
      )
      .run({ appointmentId, senderId, message });
    return ChatMessage.findById(info.lastInsertRowid);
  },

  findById(id) {
    return db
      .prepare(
        `SELECT chat_messages.*, users.name AS sender_name, users.role AS sender_role
         FROM chat_messages JOIN users ON users.id = chat_messages.sender_id
         WHERE chat_messages.id = ?`
      )
      .get(id);
  },

  listByAppointment(appointmentId) {
    return db
      .prepare(
        `SELECT chat_messages.*, users.name AS sender_name, users.role AS sender_role
         FROM chat_messages JOIN users ON users.id = chat_messages.sender_id
         WHERE appointment_id = ? ORDER BY created_at ASC`
      )
      .all(appointmentId);
  },
};

module.exports = ChatMessage;
