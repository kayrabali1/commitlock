import { Firestore } from '@google-cloud/firestore';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firestore
// In GCP Cloud Run, the Firestore SDK automatically discovers the Project ID and Application Default Credentials.
// Locally, it will read GOOGLE_APPLICATION_CREDENTIALS or use the Firestore Emulator if FIRESTORE_EMULATOR_HOST is set.
const db = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || 'commitlock-499812',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

export { db };
export default db;
