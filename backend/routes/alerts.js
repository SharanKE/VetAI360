const express = require("express");
const Alert = require("../models/Alert");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res) => {
  if (req.user.role === "farmer") {
    return res.json({ alerts: await Promise.resolve(Alert.listByOwner(req.user.id)) });
  }
  return res.json({ alerts: await Promise.resolve(Alert.listAll()) });
});

router.post("/:id/resolve", async (req, res) => {
  const alert = await Promise.resolve(Alert.resolve(req.params.id));
  res.json({ alert });
});

module.exports = router;
