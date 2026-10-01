const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  animal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true },
  type: { type: String, required: true },
  severity: { type: String, required: true },
  message: { type: String, required: true },
  resolved: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

const Model = mongoose.model('Alert', AlertSchema);

function map(doc){ if(!doc) return null; const o = typeof doc.toObject==='function'?doc.toObject():doc; o.id = o._id.toString(); return o; }

module.exports = {
  create: async ({ animalId, type, severity, message }) => map(await Model.create({ animal_id: animalId, type, severity, message })),

  listByOwner: async (ownerId) => {
    const animals = await mongoose.model('Animal').find({ owner_id: ownerId }).select('_id name species').lean();
    const ids = animals.map(a => a._id);
    const rows = await Model.find({ animal_id: { $in: ids } }).sort({ created_at: -1 }).lean();
    return rows.map(r => { const o = { ...r }; o.id = o._id.toString(); const a = animals.find(x => x._id.toString() === r.animal_id.toString()); if (a) { o.animal_name = a.name; o.species = a.species; } return o; });
  },

  listAll: async () => {
    const rows = await Model.find({}).sort({ created_at: -1 }).limit(200).lean();
    // attach animal info
    const animalIds = [...new Set(rows.map(r => r.animal_id.toString()))];
    const animals = await mongoose.model('Animal').find({ _id: { $in: animalIds } }).select('_id name owner_id').lean();
    return rows.map(r => { const o = { ...r }; o.id = o._id.toString(); const a = animals.find(x => x._id.toString() === r.animal_id.toString()); if (a) { o.animal_name = a.name; o.owner_id = a.owner_id; } return o; });
  },

  recentUnresolvedOfType: async (animalId, type, withinMinutes = 60) => map(await Model.findOne({ animal_id: animalId, type, resolved: false, created_at: { $gte: new Date(Date.now() - withinMinutes * 60 * 1000) } }).lean()),

  resolve: async (id) => { await Model.updateOne({ _id: id }, { $set: { resolved: true } }); return module.exports.findById(id); },

  findById: async (id) => map(await Model.findById(id).lean()),
};
