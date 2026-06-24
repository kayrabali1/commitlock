import { Firestore } from '@google-cloud/firestore';
import dotenv from 'dotenv';

dotenv.config();

// Fallback to local Firestore emulator if no GCP credentials are set
if (process.env.NODE_ENV !== 'production' && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8081';
  console.log('No GCP credentials found. Falling back to local Firestore emulator at 127.0.0.1:8081');
}

// Initialize Firestore
const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'commitlock-499812',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export { db };
export default db;
