import { MongoClient } from 'mongodb';

// A fresh client belongs to this request. Do not share sockets between Worker requests.
export async function connect(env) {
  if (!env.MONGODB_URI) throw new Error('DATABASE_NOT_CONFIGURED');
  const client = new MongoClient(env.MONGODB_URI, {
    maxPoolSize: 2, minPoolSize: 0, serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000, socketTimeoutMS: 15000,
    tls: true, retryWrites: true
  });
  try { await client.connect(); return { db: client.db(env.MONGODB_DB || 'engineering_portal'), close: () => client.close() }; }
  catch (error) { await client.close(); throw error; }
}

export async function indexes(db) {
  await Promise.all([
    db.collection('reports').createIndex({ number: 1 }, { unique: true }),
    db.collection('reports').createIndex({ projectId: 1, date: -1 }),
    db.collection('contracts').createIndex({ number: 1 }, { unique: true }),
    db.collection('contracts').createIndex({ projectId: 1, contractDate: -1 }),
    db.collection('activity').createIndex({ at: -1 }),
    db.collection('users').createIndex({ employeeNo: 1 }, { unique: true }),
    db.collection('users').createIndex({ projectId: 1, deleted: 1 }),
    db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('attempts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('inspections').createIndex({ assignedTo: 1, deleted: 1, date: -1 }),
    db.collection('inspections').createIndex({ projectId: 1, deleted: 1 }),
    db.collection('photos').createIndex({ parentType: 1, parentId: 1, deleted: 1 })
  ]);
}
