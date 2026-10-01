const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  appointment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const Model = mongoose.model('ChatMessage', ChatSchema);

function map(doc){ if(!doc) return null; const o = typeof doc.toObject==='function'?doc.toObject():doc; o.id = o._id.toString(); return o; }

module.exports = {
  create: async ({ appointmentId, senderId, message }) => map(await Model.create({ appointment_id: appointmentId, sender_id: senderId, message })),

  findById: async (id) => {
    const doc = await Model.findById(id).populate('sender_id').lean();
    if (!doc) return null; const o = { ...doc, id: doc._id.toString() }; o.sender_name = doc.sender_id?.name; o.sender_role = doc.sender_id?.role; return o;
  },

  listByAppointment: async (appointmentId) => {
    const docs = await Model.find({ appointment_id: appointmentId }).populate('sender_id').sort({ created_at: 1 }).lean();
    return docs.map(d => { const o = { ...d, id: d._id.toString() }; o.sender_name = d.sender_id?.name; o.sender_role = d.sender_id?.role; return o; });
  },
};
