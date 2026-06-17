const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Oblixel-Academy:Oblixel-Academy@oblixel-academy.bpn6zdt.mongodb.net/?retryWrites=true&w=majority';

async function connectDB() {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      dbName: 'oblixel_academy',
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000
    });

    console.log(`\n✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📚 Database: ${conn.connection.db.databaseName}`);
    console.log(`📊 Collections: ${Object.keys(conn.connection.collections).length} loaded\n`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return null;
  }
}

module.exports = connectDB;
