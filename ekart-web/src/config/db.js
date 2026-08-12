const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // URI comes exclusively from environment — never hardcoded
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI environment variable is not set');

    await mongoose.connect(uri, {
      autoIndex: process.env.NODE_ENV !== 'production',
    });

    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error (WARNING: Database-dependent features will fail):', err.message);
    // process.exit(1);
  }
};

module.exports = connectDB;
