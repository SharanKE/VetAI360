const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { toId } = require('../../utils/id');

function mapUser(doc) {
  if (!doc) return null;
  const user = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  user.id = toId(user._id ?? user.id);
  return user;
}

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password_hash: { type: String, required: true },
  role: { type: String, required: true, enum: ['farmer', 'vet', 'admin'] },
  phone: String,
  specialty: String,
  verified: { type: Boolean, default: true },
  language: { type: String, default: 'en' },
  created_at: { type: Date, default: Date.now },
});

UserSchema.statics.createUser = async function ({ name, email, passwordHash, role, phone, specialty, language }) {
  const verified = true;
  const user = new this({
    name,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    role,
    phone: phone || null,
    specialty: specialty || null,
    verified,
    language: language || 'en',
  });
  await user.save();
  return mapUser(user);
};

UserSchema.statics.findByEmail = async function (email) {
  return mapUser(await this.findOne({ email: email.toLowerCase() }).lean());
};

UserSchema.statics.findById = async function (id) {
  return mapUser(await this.findOne({ _id: id }).lean());
};

UserSchema.statics.publicView = function (user) {
  if (!user) return null;
  const mapped = mapUser(user);
  const { password_hash, __v, ...rest } = mapped;
  return rest;
};

UserSchema.statics.listByRole = async function (role) {
  return (await this.find({ role }).sort({ created_at: -1 }).lean()).map(mapUser);
};

UserSchema.statics.listAll = async function () {
  return (await this.find({}).sort({ created_at: -1 }).lean()).map(mapUser);
};

UserSchema.statics.setVerified = async function (id, verified) {
  await this.updateOne({ _id: id }, { $set: { verified: !!verified } });
  return this.findById(id);
};

UserSchema.statics.listVerifiedVets = async function () {
  return (await this.find({ role: 'vet', verified: true }).sort({ name: 1 }).lean()).map(mapUser);
};

// Compatibility layer naming: export methods similar to sqlite model
const Model = mongoose.model('User', UserSchema);

module.exports = {
  create: (args) => Model.createUser(args),
  findByEmail: (email) => Model.findByEmail(email),
  findById: (id) => Model.findById(id),
  publicView: (user) => Model.publicView(user),
  listByRole: (role) => Model.listByRole(role),
  listAll: () => Model.listAll(),
  setVerified: (id, v) => Model.setVerified(id, v),
  listVerifiedVets: () => Model.listVerifiedVets(),
};
