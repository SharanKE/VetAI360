const mongoose = require('mongoose');
const { toId } = require('../../utils/id');

const AnimalSchema = new mongoose.Schema({
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  species: { type: String, required: true },
  breed: String,
  gender: String,
  age_months: Number,
  tag_id: String,
  photo_url: String,
  monitoring_enabled: { type: Boolean, default: true },
  geofence_center_lat: { type: Number, default: 12.9716 },
  geofence_center_lng: { type: Number, default: 77.5946 },
  geofence_radius_m: { type: Number, default: 500 },
  last_latitude: { type: Number, default: 12.9716 },
  last_longitude: { type: Number, default: 77.5946 },
  device_id: String,
  created_at: { type: Date, default: Date.now },
});

const Model = mongoose.model('Animal', AnimalSchema);

function map(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  o.id = toId(o._id ?? o.id);
  o.owner_id = toId(o.owner_id);
  return o;
}

module.exports = {
  create: async ({ ownerId, name, species, breed, gender, ageMonths, tagId, photoUrl, monitoringEnabled }) => {
    const a = await Model.create({
      owner_id: ownerId,
      name,
      species,
      breed: breed || null,
      gender: gender || null,
      age_months: ageMonths || null,
      tag_id: tagId || null,
      photo_url: photoUrl || null,
      monitoring_enabled: monitoringEnabled === false ? false : true,
    });
    return map(a);
  },

  findById: async (id) => map(await Model.findById(id).lean()),

  listByOwner: async (ownerId) => (await Model.find({ owner_id: ownerId }).sort({ created_at: -1 }).lean()).map(map),

  listAll: async () => (await Model.find({}).sort({ created_at: -1 }).lean()).map(map),

  listMonitored: async () => (await Model.find({ monitoring_enabled: true }).lean()).map(map),

  update: async (id, fields) => {
    const allowed = ['name','species','breed','gender','age_months','tag_id','photo_url','monitoring_enabled','geofence_center_lat','geofence_center_lng','geofence_radius_m','last_latitude','last_longitude','device_id'];
    const data = {};
    Object.keys(fields).forEach(k => { if (allowed.includes(k)) data[k] = fields[k]; });
    await Model.updateOne({ _id: id }, { $set: data });
    return module.exports.findById(id);
  },

  updateGeofence: async (id, { lat, lng, radius }) => {
    await Model.updateOne({ _id: id }, { $set: { geofence_center_lat: lat, geofence_center_lng: lng, geofence_radius_m: radius } });
    return module.exports.findById(id);
  },

  updateLocation: async (id, lat, lng) => {
    await Model.updateOne({ _id: id }, { $set: { last_latitude: lat, last_longitude: lng } });
    return module.exports.findById(id);
  },

  remove: async (id) => { await Model.deleteOne({ _id: id }); },
};
