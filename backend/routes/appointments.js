const express = require("express");
const Appointment = require("../models/Appointment");
const User = require("../models/User");
const ChatMessage = require("../models/ChatMessage");
const { authenticate, requireRole } = require("../middleware/auth");
const { sameId } = require("../utils/id");

const router = express.Router();
router.use(authenticate);

router.get("/vets", requireRole("farmer", "admin"), async (req, res) => {
  const vets = await Promise.resolve(User.listVerifiedVets());
  res.json({ vets: vets.map(User.publicView) });
});

router.get("/", async (req, res) => {
  res.json({ appointments: await Promise.resolve(Appointment.listForUser(req.user.id, req.user.role)) });
});

router.post("/", requireRole("farmer"), async (req, res) => {
  const { vetId, animalId, reason, scheduledTime } = req.body;
  if (!vetId || !scheduledTime) {
    return res.status(400).json({ error: "vetId and scheduledTime are required." });
  }
  const vet = await Promise.resolve(User.findById(vetId));
  if (!vet || vet.role !== "vet") {
    return res.status(400).json({ error: "Selected vet is not available for consultations." });
  }
  const appointment = await Promise.resolve(
    Appointment.create({ farmerId: req.user.id, vetId, animalId, reason, scheduledTime })
  );

  // If reason is provided, create initial chat message from farmer so vet sees it immediately
  if (reason && reason.trim()) {
    try {
      await Promise.resolve(
        ChatMessage.create({
          appointmentId: appointment.id,
          senderId: req.user.id,
          message: reason.trim(),
        })
      );
    } catch (err) {
      console.warn("Could not save initial chat message:", err);
    }
  }

  // Notify vet in real-time
  const io = req.app.get("io");
  if (io) {
    io.to(`user:${vetId}`).emit("appointment:new", appointment);
    io.to(`owner:${vetId}`).emit("appointment:new", appointment);
  }

  res.status(201).json({ appointment });
});

router.get("/:id", async (req, res) => {
  const appointment = await Promise.resolve(Appointment.findById(req.params.id));
  if (
    !appointment ||
    (!sameId(req.user.id, appointment.farmer_id) &&
      !sameId(req.user.id, appointment.vet_id) &&
      req.user.role !== "admin")
  ) {
    return res.status(404).json({ error: "Appointment not found." });
  }
  res.json({ appointment, messages: await Promise.resolve(ChatMessage.listByAppointment(appointment.id)) });
});

router.post("/:id/status", requireRole("vet", "admin"), async (req, res) => {
  const { status } = req.body;
  if (!["confirmed", "completed", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }
  const appointment = await Promise.resolve(Appointment.updateStatus(req.params.id, status));

  // Notify farmer in real-time
  const io = req.app.get("io");
  if (io && appointment) {
    io.to(`user:${appointment.farmer_id}`).emit("appointment:status", appointment);
    io.to(`appointment:${appointment.id}`).emit("appointment:status", appointment);
  }

  res.json({ appointment });
});

module.exports = router;
