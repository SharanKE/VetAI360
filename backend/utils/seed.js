const path = require('path');
const fs = require('fs');

const backendEnv = path.join(__dirname, '..', '.env');
if (fs.existsSync(backendEnv)) {
  require('dotenv').config({ path: backendEnv });
} else {
  require('dotenv').config();
}
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Animal = require('../models/Animal');
const Vaccination = require('../models/Vaccination');
const HealthRecord = require('../models/HealthRecord');
const { toId } = require('../utils/id');

async function upsertUser({ name, email, password, role, phone, specialty }) {
  let user = await User.findByEmail(email);
  if (user) return user;
  user = await User.create({ name, email, passwordHash: bcrypt.hashSync(password, 10), role, phone, specialty });
  if (role === 'vet') await User.setVerified(toId(user.id ?? user._id), true);
  return user;
}

async function main(){
  if (process.env.DB_TYPE === 'mongo'){
    const { connectMongo } = require('../config/mongo');
    await connectMongo();
  }
  console.log('Seeding VetAI 360 demo data...\n');

  const admin = await upsertUser({ name: 'Platform Admin', email: 'admin@vetai360.dev', password: 'admin123', role: 'admin', phone: '+91 90000 00001' });
  // admin role must be set manually in sqlite; for mongo update via model
  if (process.env.DB_TYPE === 'mongo'){
    const mongoose = require('../config/mongo');
    await mongoose.model('User').updateOne({ email: 'admin@vetai360.dev' }, { $set: { role: 'admin', verified: true } });
  } else {
    const db = require('../config/db');
    db.prepare("UPDATE users SET role = 'admin', verified = 1 WHERE email = ?").run('admin@vetai360.dev');
  }

  const farmer = await upsertUser({ name: 'Ramesh Gowda', email: 'farmer@vetai360.dev', password: 'farmer123', role: 'farmer', phone: '+91 90000 00002' });

  const vet = await upsertUser({ name: 'Dr. Arpitha J C', email: 'vet@vetai360.dev', password: 'vet123', role: 'vet', phone: '+91 90000 00003', specialty: 'Large Animal Medicine' });

  const farmerId = toId(farmer.id ?? farmer._id);
  const vetId = toId(vet.id ?? vet._id);
  const existingAnimals = await Animal.listByOwner(farmerId);
  let cow, goat;
  if (!existingAnimals || existingAnimals.length === 0) {
    cow = await Animal.create({ ownerId: farmerId, name: 'Ganga', species: 'Cattle', breed: 'Gir', gender: 'Female', ageMonths: 40, tagId: 'IN-KA-0192' });
    goat = await Animal.create({ ownerId: farmerId, name: 'Motu', species: 'Goat', breed: 'Osmanabadi', gender: 'Male', ageMonths: 14, tagId: 'IN-KA-0193' });

    const cowId = toId(cow.id);
    const goatId = toId(goat.id);
    await Vaccination.create({ animalId: cowId, vaccineName: 'Foot and Mouth Disease (FMD)', dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0,10) });
    await Vaccination.create({ animalId: cowId, vaccineName: 'Haemorrhagic Septicaemia (HS)', dueDate: new Date(Date.now() + 40 * 86400000).toISOString().slice(0,10) });
    await Vaccination.create({ animalId: goatId, vaccineName: 'Peste des Petits Ruminants (PPR)', dueDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0,10) });

    await HealthRecord.create({ animalId: cowId, vetId, diagnosis: 'Routine checkup — healthy', treatment: 'None', notes: 'Good body condition score, no abnormalities.', source: 'manual' });

    console.log(`Created demo animals: ${cow.name} (Cattle), ${goat.name} (Goat)`);
  } else {
    console.log('Demo animals already exist — skipping.');
  }

  console.log('\nDemo accounts ready:');
  console.log('  Admin:  admin@vetai360.dev  / admin123');
  console.log('  Farmer: farmer@vetai360.dev / farmer123');
  console.log('  Vet:    vet@vetai360.dev    / vet123');
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
