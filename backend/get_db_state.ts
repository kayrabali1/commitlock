import { db } from './src/config/firestore';

async function main() {
  console.log('--- USERS ---');
  const usersSnapshot = await db.collection('users').get();
  for (const doc of usersSnapshot.docs) {
    console.log(doc.id, doc.data());
  }

  console.log('--- COMMITMENTS ---');
  const commitmentsSnapshot = await db.collection('commitments').get();
  for (const doc of commitmentsSnapshot.docs) {
    console.log(doc.id, doc.data());
  }
}

main().catch(console.error);
