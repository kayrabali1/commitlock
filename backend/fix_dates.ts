import { Firestore } from '@google-cloud/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

// Since we are likely in a GCP environment or have gcloud configured locally
// Initialize Firestore with default credentials
const db = new Firestore();

async function run() {
  console.log('Searching for corrupted commitments with NaN-NaN-NaN dates...');
  try {
    const snapshot = await db.collection('commitments').where('startDate', '==', 'NaN-NaN-NaN').get();
    
    if (snapshot.empty) {
      console.log('No corrupted commitments found.');
      return;
    }

    console.log(`Found ${snapshot.size} corrupted commitment(s). Fixing...`);

    const batch = db.batch();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // We will reset the dates to today and a default 3 day period, or use their period
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      
      const duration = data.period || 3;
      const end = new Date(start);
      end.setDate(end.getDate() + duration - 1);
      end.setHours(23, 59, 59, 999);

      const getDateISOStr = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const fixedStartDate = getDateISOStr(start);
      const fixedEndDate = getDateISOStr(end);

      console.log(`Fixing commitment ${doc.id}: Setting startDate=${fixedStartDate}, endDate=${fixedEndDate}`);

      batch.update(doc.ref, {
        startDate: fixedStartDate,
        endDate: fixedEndDate,
        period: duration, // ensure period is at least present
      });
    });

    await batch.commit();
    console.log('Successfully fixed all corrupted commitments!');
  } catch (error) {
    console.error('Error fixing commitments:', error);
  }
}

run();
