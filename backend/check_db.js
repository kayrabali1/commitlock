const { Firestore } = require('@google-cloud/firestore');
const firestore = new Firestore({
  projectId: 'habitcontract-dev',
  keyFilename: './service-account.json',
});

async function check() {
  const snapshot = await firestore.collection('commitments').get();
  console.log('Total commitments:', snapshot.size);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data().status, doc.data().userId, doc.data().endDate);
  });
}
check().catch(console.error);
