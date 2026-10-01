const express = require("express");
const User = require("../models/User");
const Animal = require("../models/Animal");
const Alert = require("../models/Alert");
const { authenticate, requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate, requireRole("admin"));

router.get("/overview", async (req, res) => {
  const users = await Promise.resolve(User.listAll());
  const farmers = await Promise.resolve(User.listByRole("farmer"));
  const vets = await Promise.resolve(User.listByRole("vet"));
  const animals = await Promise.resolve(Animal.listAll());
  const alerts = await Promise.resolve(Alert.listAll());
  res.json({
    totalUsers: users.length,
    totalFarmers: farmers.length,
    totalVets: vets.length,
    pendingVets: vets.filter((v) => !v.verified).length,
    totalAnimals: animals.length,
    unresolvedAlerts: alerts.filter((a) => !a.resolved).length,
  });
});

router.get("/vets", async (req, res) => {
  const vets = await Promise.resolve(User.listByRole("vet"));
  res.json({ vets: vets.map(User.publicView) });
});

router.post("/vets/:id/verify", async (req, res) => {
  const user = await Promise.resolve(User.setVerified(req.params.id, true));
  res.json({ user: User.publicView(user) });
});

router.post("/vets/:id/revoke", async (req, res) => {
  const user = await Promise.resolve(User.setVerified(req.params.id, false));
  res.json({ user: User.publicView(user) });
});

router.get("/users", async (req, res) => {
  const users = await Promise.resolve(User.listAll());
  res.json({ users: users.map(User.publicView) });
});

module.exports = router;
