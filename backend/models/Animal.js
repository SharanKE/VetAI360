if (process.env.DB_TYPE === 'mongo') {
  module.exports = require('./mongo/Animal');
  return;
}

const db = require("../config/db");

const Animal = {
  create({ ownerId, name, species, breed, gender, ageMonths, tagId, photoUrl, monitoringEnabled }) {
    const stmt = db.prepare(`
      INSERT INTO animals (owner_id, name, species, breed, gender, age_months, tag_id, photo_url, monitoring_enabled)
      VALUES (@ownerId, @name, @species, @breed, @gender, @ageMonths, @tagId, @photoUrl, @monitoringEnabled)
    `);
    const info = stmt.run({
      ownerId,
      name,
      species,
      breed: breed || null,
      gender: gender || null,
      ageMonths: ageMonths || null,
      tagId: tagId || null,
      photoUrl: photoUrl || null,
      monitoringEnabled: monitoringEnabled === false ? 0 : 1,
    });
    return Animal.findById(info.lastInsertRowid);
  },

  findById(id) {
    return db.prepare("SELECT * FROM animals WHERE id = ?").get(id);
  },

  listByOwner(ownerId) {
    return db.prepare("SELECT * FROM animals WHERE owner_id = ? ORDER BY created_at DESC").all(ownerId);
  },

  listAll() {
    return db
      .prepare(
        `SELECT animals.*, users.name AS owner_name, users.phone AS owner_phone
         FROM animals JOIN users ON users.id = animals.owner_id
         ORDER BY animals.created_at DESC`
      )
      .all();
  },

  listMonitored() {
    return db.prepare("SELECT * FROM animals WHERE monitoring_enabled = 1").all();
  },

  update(id, fields) {
    const allowed = [
      "name",
      "species",
      "breed",
      "gender",
      "age_months",
      "tag_id",
      "photo_url",
      "monitoring_enabled",
      "geofence_center_lat",
      "geofence_center_lng",
      "geofence_radius_m",
      "last_latitude",
      "last_longitude",
      "device_id",
    ];
    const keys = Object.keys(fields).filter((k) => allowed.includes(k));
    if (keys.length === 0) return Animal.findById(id);
    const setClause = keys.map((k) => `${k} = @${k}`).join(", ");
    db.prepare(`UPDATE animals SET ${setClause} WHERE id = @id`).run({ ...fields, id });
    return Animal.findById(id);
  },

  updateGeofence(id, { lat, lng, radius }) {
    db.prepare(
      `UPDATE animals SET geofence_center_lat = ?, geofence_center_lng = ?, geofence_radius_m = ? WHERE id = ?`
    ).run(lat, lng, radius, id);
    return Animal.findById(id);
  },

  updateLocation(id, lat, lng) {
    db.prepare(
      `UPDATE animals SET last_latitude = ?, last_longitude = ? WHERE id = ?`
    ).run(lat, lng, id);
    return Animal.findById(id);
  },

  remove(id) {
    db.prepare("DELETE FROM animals WHERE id = ?").run(id);
  },
};

module.exports = Animal;
