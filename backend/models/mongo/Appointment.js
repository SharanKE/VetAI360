const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { toId } = require('../../utils/id');

const AppointmentSchema = new mongoose.Schema({
  farmer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  animal_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal' },
  reason: String,
  scheduled_time: { type: Date, required: true },
  status: { type: String, default: 'pending' },
  meeting_room: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const Model = mongoose.model('Appointment', AppointmentSchema);

function mapAppointment(doc) {
  if (!doc) return null;
  const o = { ...doc, id: toId(doc._id) };
  o.farmer_id = toId(doc.farmer_id);
  o.vet_id = toId(doc.vet_id);
  o.animal_id = doc.animal_id != null ? toId(doc.animal_id) : null;
  o.farmer_name = doc.farmer_id?.name ?? o.farmer_name;
  o.vet_name = doc.vet_id?.name ?? o.vet_name;
  o.animal_name = doc.animal_id?.name ?? o.animal_name;
  return o;
}

module.exports = {
  create: async ({ farmerId, vetId, animalId, reason, scheduledTime }) => {
    const meetingRoom = `vetai360-${uuidv4().slice(0,8)}`;
    const a = await Model.create({ farmer_id: farmerId, vet_id: vetId, animal_id: animalId || null, reason: reason || null, scheduled_time: scheduledTime, meeting_room: meetingRoom });
    return module.exports.findById(a._id);
  },

  findById: async (id) => {
    const doc = await Model.findById(id).populate('farmer_id vet_id animal_id').lean();
    return mapAppointment(doc);
  },

  listForUser: async (userId, role) => {
    const column = role === 'vet' ? 'vet_id' : 'farmer_id';
    const q = {};
    q[column] = userId;
    const docs = await Model.find(q).populate('farmer_id vet_id animal_id').sort({ scheduled_time: -1 }).lean();
    return docs.map(mapAppointment);
  },

  updateStatus: async (id, status) => { await Model.updateOne({ _id: id }, { $set: { status } }); return module.exports.findById(id); },
};
