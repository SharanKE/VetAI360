const express = require("express");
const Vaccination = require("../models/Vaccination");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  if (req.user.role === "farmer") {
    return res.json({ vaccinations: await Promise.resolve(Vaccination.listByOwner(req.user.id)) });
  }
  return res.json({ vaccinations: await Promise.resolve(Vaccination.listUpcoming(3650)) });
});

router.get("/upcoming", async (req, res) => {
  const days = Number(req.query.days || 14);
  if (req.user.role === "farmer") {
    return res.json({ vaccinations: await Promise.resolve(Vaccination.listUpcomingForOwner(req.user.id, days)) });
  }
  res.json({ vaccinations: await Promise.resolve(Vaccination.listUpcoming(days)) });
});

router.post("/:id/complete", async (req, res) => {
  const updated = await Promise.resolve(Vaccination.markComplete(req.params.id));
  res.json({ vaccination: updated });
});

router.delete("/:id", async (req, res) => {
  await Promise.resolve(Vaccination.remove(req.params.id));
  res.json({ success: true });
});

module.exports = router;
