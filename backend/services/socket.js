const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ChatMessage = require("../models/ChatMessage");
const Appointment = require("../models/Appointment");
const { withUserId, sameId } = require("../utils/id");

function attachSocketHandlers(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = withUserId(await Promise.resolve(User.findById(payload.id)));
      if (!user) return next(new Error("Account not found"));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid session"));
    }
  });

  io.on("connection", (socket) => {
    const { user } = socket;
    socket.join(`owner:${user.id}`);
    socket.join(`user:${user.id}`);

    socket.on("animal:subscribe", (animalId) => {
      socket.join(`animal:${animalId}`);
    });

    socket.on("appointment:join", async (appointmentId) => {
      const appt = await Promise.resolve(Appointment.findById(appointmentId));
      if (!appt) return;
      if (!sameId(user.id, appt.farmer_id) && !sameId(user.id, appt.vet_id) && user.role !== "admin") return;
      socket.join(`appointment:${appointmentId}`);
    });

    socket.on("appointment:message", async ({ appointmentId, message }) => {
      if (!message || !message.trim()) return;
      const appt = await Promise.resolve(Appointment.findById(appointmentId));
      if (!appt) return;
      if (!sameId(user.id, appt.farmer_id) && !sameId(user.id, appt.vet_id) && user.role !== "admin") return;
      const saved = await Promise.resolve(
        ChatMessage.create({ appointmentId, senderId: user.id, message: message.trim() })
      );
      io.to(`appointment:${appointmentId}`).emit("appointment:message", saved);

      // Also notify the other participant in real time if they are outside the room
      const recipientId = sameId(user.id, appt.farmer_id) ? appt.vet_id : appt.farmer_id;
      io.to(`user:${recipientId}`).emit("chat:notification", {
        appointmentId,
        message: saved,
        senderName: user.name,
      });
      io.to(`owner:${recipientId}`).emit("chat:notification", {
        appointmentId,
        message: saved,
        senderName: user.name,
      });
    });

    socket.on("disconnect", () => {
      // no-op; rooms are cleaned up automatically by socket.io
    });
  });
}

module.exports = { attachSocketHandlers };
