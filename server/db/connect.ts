import mongoose from 'mongoose';

let isConnected = false;

export function isMongoActive(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

export function isProductionStrictMode(): boolean {
  return process.env.NODE_ENV === 'production' && process.env.ALLOW_IN_MEMORY_FALLBACK !== 'true';
}

export async function connectToDatabase(): Promise<{ isConnected: boolean; uri?: string }> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    if (isProductionStrictMode()) {
      const msg = 'CRITICAL: MONGODB_URI environment variable is required in production environment.';
      console.error('❌ ' + msg);
      throw new Error(msg);
    }
    console.log('ℹ️  No MONGODB_URI detected. Operating with in-memory resilient datastore for local development/test preview.');
    return { isConnected: false };
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return { isConnected: true, uri };
  }

  try {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 20,
      minPoolSize: 5,
    };
    await mongoose.connect(uri, opts);
    isConnected = true;
    console.log('✅ Connected to MongoDB production database successfully.');
    return { isConnected: true, uri };
  } catch (error) {
    isConnected = false;
    if (isProductionStrictMode()) {
      console.error('❌ MongoDB connection failed in production strict mode:', (error as Error).message);
      throw error;
    }
    console.warn('⚠️  MongoDB connection failed, falling back to in-memory store for local preview:', (error as Error).message);
    return { isConnected: false };
  }
}

export function getDatabaseStatus() {
  const isMongo = isConnected && mongoose.connection.readyState === 1;
  return {
    isRealMongoConnected: isMongo,
    mode: isMongo ? 'MongoDB (Mongoose Production Pool)' : 'Resilient In-Memory Development Store',
    strictProductionMode: isProductionStrictMode(),
  };
}
