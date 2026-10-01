const cron = require("node-cron");
const Vaccination = require("../models/Vaccination");
const Alert = require("../models/Alert");
const Animal = require("../models/Animal");

async function runCheck(io) {
  return (async () => {
    const upcoming = await Promise.resolve(Vaccination.listUpcoming(7)); // due within a week (includes overdue)
    if (!upcoming || upcoming.length === 0) return;
    for (const v of upcoming) {
      const existing = await Promise.resolve(Alert.recentUnresolvedOfType(v.animal_id, "vaccination_due", 60 * 24)); // once per day
      if (existing) continue;
      const dueDateFormatted = new Date(v.due_date).toISOString().slice(0, 10);
      const isOverdue = new Date(v.due_date) < new Date();
      const alert = await Promise.resolve(
        Alert.create({
          animalId: v.animal_id,
          type: "vaccination_due",
          severity: isOverdue ? "high" : "low",
          message: isOverdue
            ? `${v.animal_name}'s "${v.vaccine_name}" vaccination was due on ${dueDateFormatted} and is now overdue.`
            : `${v.animal_name}'s "${v.vaccine_name}" vaccination is due on ${dueDateFormatted}.`,
        })
      );
      if (io) io.to(`owner:${v.owner_id}`).emit("alert:new", alert);
    }
  })();
}

function start(io) {
  // Run once at boot, then every morning at 7am server time.
  runCheck(io).catch((err) => console.error('vaccination runCheck error', err));
  cron.schedule("0 7 * * *", () => runCheck(io).catch((err) => console.error('vaccination runCheck error', err)));
  console.log("Vaccination reminder scheduler started (daily at 07:00).");
}

module.exports = { start, runCheck };
