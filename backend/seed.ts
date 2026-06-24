import { db } from './src/config/firestore';
import bcrypt from 'bcryptjs';

async function seed() {
  const usersRef = db.collection('users');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password', salt);
  
  await usersRef.doc('demo_user_id').set({
    name: 'Kayra Bali',
    email: 'demo@habitcontract.com',
    passwordHash,
    avatar: 'https://ui-avatars.com/api/?name=Kayra+Bali&background=8B5CF6&color=fff&bold=true',
    tier: 'High Accountability (Tier 3)',
    createdAt: new Date().toISOString(),
    hasPaymentMethod: false
  });

  console.log('Seed completed!');
}

seed().catch(console.error);
