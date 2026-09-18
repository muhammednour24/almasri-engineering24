import { MongoClient } from 'mongodb';
import { indexes } from '../src/db.js';
import { password } from '../src/security.js';
if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI before initializing the owner.');
if (!process.env.OWNER_PASSWORD) throw new Error('Set OWNER_PASSWORD before initializing the owner.');
const ownerName = process.env.OWNER_NAME || 'محمد نور المصري';
const ownerEmployeeNo = process.env.OWNER_EMPLOYEE_NO || '05340173180';
const client = new MongoClient(process.env.MONGODB_URI, { tls: true });
try {
 await client.connect(); const db = client.db(process.env.MONGODB_DB || 'engineering_portal');
 if (await db.collection('users').findOne({_id:'owner'})) throw new Error('Owner already exists. No account was changed.');
 await indexes(db);
 await db.collection('users').insertOne({_id:'owner',name:ownerName,employeeNo:ownerEmployeeNo,passwordHash:password(process.env.OWNER_PASSWORD),profession:'مدير النظام',phone:'',projectId:'',role:'admin',active:true,deleted:false,createdAt:new Date()});
 console.log('Owner created. Sign in and change the password in My account when needed.');
} finally { await client.close(); }
