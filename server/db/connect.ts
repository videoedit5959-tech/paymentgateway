import mongoose from 'mongoose';

declare global {
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

let isConnected = false;

export function isMongoActive(): boolean {
  return Boolean((isConnected || (cached?.conn && (cached.conn.connection.readyState as number) === 1)) && (mongoose.connection.readyState as number) === 1);
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

  // Reuse cached connection if active
  if ((mongoose.connection.readyState as number) === 1) {
    isConnected = true;
    return { isConnected: true, uri };
  }

  // Await existing connection promise if connection is currently in progress
  if (cached?.promise) {
    try {
      await cached.promise;
      isConnected = (mongoose.connection.readyState as number) === 1;
      if (isConnected) {
        return { isConnected: true, uri };
      }
    } catch {
      cached.promise = null;
      cached.conn = null;
    }
  }

  try {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 20,
      minPoolSize: 1,
    };
    
    if (cached) {
      cached.promise = mongoose.connect(uri, opts);
      cached.conn = await cached.promise;
    } else {
      await mongoose.connect(uri, opts);
    }

    isConnected = true;
    console.log('✅ Connected to MongoDB production database successfully.');
    return { isConnected: true, uri };
  } catch (error) {
    isConnected = false;
    if (cached) {
      cached.promise = null;
      cached.conn = null;
    }
    if (isProductionStrictMode()) {
      console.error('❌ MongoDB connection failed in production strict mode:', (error as Error).message);
      throw error;
    }
    console.warn('⚠️  MongoDB connection failed, falling back to in-memory store for local preview:', (error as Error).message);
    return { isConnected: false };
  }
}

export function getDatabaseStatus() {
  const isMongo = (isConnected || (mongoose.connection.readyState as number) === 1) && (mongoose.connection.readyState as number) === 1;
  return {
    isRealMongoConnected: isMongo,
    mode: isMongo ? 'MongoDB (Mongoose Production Pool)' : 'Resilient In-Memory Development Store',
    strictProductionMode: isProductionStrictMode(),
  };
}
