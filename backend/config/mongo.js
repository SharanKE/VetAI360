const mongoose = require("mongoose");

const mongoUri =
  process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/vetai360";

mongoose.set("strictQuery", false);

let connectPromise;

function isAtlasUri(uri) {
  return uri.startsWith("mongodb+srv://");
}

function connectMongo() {
  if (!connectPromise) {
    const options = {
      dbName: process.env.MONGO_DB_NAME || "vetai360",
      serverSelectionTimeoutMS: 15000,
    };

    // Atlas uses TLS automatically via mongodb+srv; local/docker uses plain mongodb://
    if (isAtlasUri(mongoUri)) {
      options.retryWrites = true;
      options.w = "majority";
    }

    connectPromise = mongoose
      .connect(mongoUri, options)
      .then(() => {
        const host = isAtlasUri(mongoUri) ? "MongoDB Atlas" : mongoUri;
        console.log("Connected to MongoDB:", host);
        return mongoose;
      })
      .catch((err) => {
        connectPromise = null;
        console.error("Failed to connect to MongoDB:", err.message);
        throw err;
      });
  }
  return connectPromise;
}

async function mongoHealth() {
  try {
    if (mongoose.connection.readyState !== 1) return { ok: false, state: mongoose.connection.readyState };
    await mongoose.connection.db.admin().ping();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = mongoose;
module.exports.connectMongo = connectMongo;
module.exports.mongoHealth = mongoHealth;
