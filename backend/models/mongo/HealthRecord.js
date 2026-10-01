const mongoose = require('mongoose');

const HRSchema = new mongoose.Schema({
  animal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true },
  vet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  diagnosis: { type: String, required: true },
  treatment: String,
  notes: String,
  source: { type: String, default: 'manual' },
  confidence: Number,
  record_date: { type: Date, default: Date.now },
});

const Model = mongoose.model('HealthRecord', HRSchema);

function map(doc){ if(!doc) return null; const o = typeof doc.toObject==='function'?doc.toObject():doc; o.id = o._id.toString(); return o; }

module.exports = {
  create: async ({ animalId, vetId, diagnosis, treatment, notes, source, confidence }) => map(await Model.create({ animal_id: animalId, vet_id: vetId || null, diagnosis, treatment: treatment || null, notes: notes || null, source: source || 'manual', confidence: confidence || null })),

  listByAnimal: async (animalId) => {
    const rows = await Model.find({ animal_id: animalId }).sort({ record_date: -1 }).populate('vet_id').lean();
    return rows.map(r => { const o = { ...r }; o.id = o._id.toString(); o.vet_name = r.vet_id?.name; return o; });
  },
};
