const mongoose = require('mongoose');

const VaccSchema = new mongoose.Schema({
  animal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true },
  vaccine_name: { type: String, required: true },
  due_date: { type: Date, required: true },
  completed: { type: Boolean, default: false },
  completed_date: Date,
  notes: String,
  created_at: { type: Date, default: Date.now },
});

const Model = mongoose.model('Vaccination', VaccSchema);

function map(doc){ if(!doc) return null; const o = typeof doc.toObject==='function'?doc.toObject():doc; o.id = o._id.toString(); return o; }

module.exports = {
  create: async ({ animalId, vaccineName, dueDate, notes }) => {
    const v = await Model.create({ animal_id: animalId, vaccine_name: vaccineName, due_date: dueDate, notes: notes || null });
    return map(v);
  },

  listByAnimal: async (animalId) => (await Model.find({ animal_id: animalId }).sort({ due_date: 1 }).lean()).map(map),

  listByOwner: async (ownerId) => {
    // join with animals to filter by owner
    const animals = await mongoose.model('Animal').find({ owner_id: ownerId }).select('_id name species').lean();
    const ids = animals.map(a => a._id);
    const rows = await Model.find({ animal_id: { $in: ids } }).sort({ due_date: 1 }).lean();
    // attach animal info
    return rows.map(r => { const o = { ...r }; o.id = o._id.toString(); const a = animals.find(x => x._id.toString() === r.animal_id.toString()); if (a) { o.animal_name = a.name; o.species = a.species; } return o; });
  },

  listUpcoming: async (withinDays = 14) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);
    const rows = await Model.find({ completed: false, due_date: { $lte: cutoff } }).sort({ due_date: 1 }).lean();
    const animalIds = [...new Set(rows.map((r) => r.animal_id.toString()))];
    const animals = await mongoose.model('Animal').find({ _id: { $in: animalIds } }).select('_id name owner_id').lean();
    return rows.map((r) => {
      const o = { ...r };
      o.id = o._id.toString();
      const animal = animals.find((a) => a._id.toString() === r.animal_id.toString());
      if (animal) {
        o.animal_name = animal.name;
        o.owner_id = animal.owner_id.toString();
      }
      return o;
    });
  },

  listUpcomingForOwner: async (ownerId, withinDays = 14) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + withinDays);
    const animals = await mongoose.model('Animal').find({ owner_id: ownerId }).select('_id name owner_id').lean();
    const ids = animals.map(a => a._id);
    const rows = await Model.find({ animal_id: { $in: ids }, completed: false, due_date: { $lte: cutoff } }).sort({ due_date: 1 }).lean();
    return rows.map((r) => {
      const o = { ...r };
      o.id = o._id.toString();
      const animal = animals.find((a) => a._id.toString() === r.animal_id.toString());
      if (animal) {
        o.animal_name = animal.name;
        o.owner_id = animal.owner_id.toString();
      }
      return o;
    });
  },

  markComplete: async (id) => { await Model.updateOne({ _id: id }, { $set: { completed: true, completed_date: new Date() } }); return module.exports.findById(id); },

  findById: async (id) => map(await Model.findById(id).lean()),

  remove: async (id) => { await Model.deleteOne({ _id: id }); },
};
