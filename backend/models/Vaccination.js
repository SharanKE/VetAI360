if (process.env.DB_TYPE === 'mongo') {
  module.exports = require('./mongo/Vaccination');
  return;
}

const db = require("../config/db");

const Vaccination = {
  create({ animalId, vaccineName, dueDate, notes }) {
    const info = db
      .prepare(
        `INSERT INTO vaccinations (animal_id, vaccine_name, due_date, notes)
         VALUES (@animalId, @vaccineName, @dueDate, @notes)`
      )
      .run({ animalId, vaccineName, dueDate, notes: notes || null });
    return db.prepare("SELECT * FROM vaccinations WHERE id = ?").get(info.lastInsertRowid);
  },

  listByAnimal(animalId) {
    return db.prepare("SELECT * FROM vaccinations WHERE animal_id = ? ORDER BY due_date ASC").all(animalId);
  },

  listByOwner(ownerId) {
    return db
      .prepare(
        `SELECT vaccinations.*, animals.name AS animal_name, animals.species
         FROM vaccinations JOIN animals ON animals.id = vaccinations.animal_id
         WHERE animals.owner_id = ? ORDER BY due_date ASC`
      )
      .all(ownerId);
  },

  listUpcoming(withinDays = 14) {
    return db
      .prepare(
        `SELECT vaccinations.*, animals.name AS animal_name, animals.owner_id
         FROM vaccinations JOIN animals ON animals.id = vaccinations.animal_id
         WHERE completed = 0 AND date(due_date) <= date('now', '+' || ? || ' days')
         ORDER BY due_date ASC`
      )
      .all(withinDays);
  },

  listUpcomingForOwner(ownerId, withinDays = 14) {
    return db
      .prepare(
        `SELECT vaccinations.*, animals.name AS animal_name, animals.owner_id
         FROM vaccinations JOIN animals ON animals.id = vaccinations.animal_id
         WHERE animals.owner_id = ? AND completed = 0 AND date(due_date) <= date('now', '+' || ? || ' days')
         ORDER BY due_date ASC`
      )
      .all(ownerId, withinDays);
  },

  markComplete(id) {
    db.prepare(
      "UPDATE vaccinations SET completed = 1, completed_date = datetime('now') WHERE id = ?"
    ).run(id);
    return db.prepare("SELECT * FROM vaccinations WHERE id = ?").get(id);
  },

  remove(id) {
    db.prepare("DELETE FROM vaccinations WHERE id = ?").run(id);
  },
};

module.exports = Vaccination;
