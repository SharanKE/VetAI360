const mongoose = require('mongoose');

const PredSchema = new mongoose.Schema({
  animal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal' },
  requested_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true },
  input_summary: String,
  result_label: { type: String, required: true },
  confidence: { type: Number, required: true },
  recommendation: String,
  created_at: { type: Date, default: Date.now },
});

const Model = mongoose.model('Prediction', PredSchema);

function map(doc){ if(!doc) return null; const o = typeof doc.toObject==='function'?doc.toObject():doc; o.id = o._id.toString(); return o; }

module.exports = {
  create: async ({ animalId, requestedBy, type, inputSummary, resultLabel, confidence, recommendation }) => map(await Model.create({ animal_id: animalId || null, requested_by: requestedBy, type, input_summary: inputSummary || null, result_label: resultLabel, confidence, recommendation: recommendation || null })),

  listByAnimal: async (animalId) => (await Model.find({ animal_id: animalId }).sort({ created_at: -1 }).lean()).map(map),

  listByUser: async (userId) => (await Model.find({ requested_by: userId }).sort({ created_at: -1 }).limit(50).lean()).map(map),
};
