import mongoose from 'mongoose';

/**
 * Connect to MongoDB instance (Local MongoDB or MongoDB Atlas)
 */
export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/healthlens';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[HealthLens AI] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.error(`[HealthLens AI] MongoDB Connection Error: ${err.message}`);
    // Do not terminate process; allow existing non-database routes (e.g. PDF upload / extraction) to remain operational
    return null;
  }
}

export default connectDB;
