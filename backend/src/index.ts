import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import cron from 'node-cron';
import { db } from './config/firestore';

import authRouter from './routes/auth';
import userRouter from './routes/user';
import commitmentsRouter from './routes/commitments';


dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

// Enable CORS for all requests so our local mobile clients can communicate with it
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' })); // support base64 avatars in request body

// Health check endpoint for GCP Cloud Run probing
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Register routers
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/commitments', commitmentsRouter);

// Set up cron job to auto-fail expired grace period commitments every hour
cron.schedule('0 * * * *', async () => {
  console.log('[Cron] Running expired grace period check...');
  try {
    const commitmentsSnapshot = await db
      .collection('commitments')
      .where('status', '==', 'active')
      .get();
      
    const now = new Date();
    let updatedCount = 0;

    for (const doc of commitmentsSnapshot.docs) {
      const data = doc.data();
      if (data.endDate) {
        const [year, month, day] = data.endDate.split('-').map(Number);
        // Grace period ends 48 hours after midnight UTC of the last day.
        // i.e., end date is day X, day X+1 is 24h, day X+2 is 48h.
        const gracePeriodEnd = new Date(Date.UTC(year, month - 1, day + 3, 0, 0, 0, 0));
        
        if (now > gracePeriodEnd) {
          await db.runTransaction(async (transaction) => {
            const currentDoc = await transaction.get(doc.ref);
            if (currentDoc.exists && currentDoc.data()?.status === 'active') {
              transaction.update(doc.ref, {
                status: 'failed',
                failureReason: 'grace_period_expired',
                resolvedAt: new Date().toISOString()
              });
              updatedCount++;
            }
          });
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`[Cron] Auto-failed ${updatedCount} expired commitments.`);
    } else {
      console.log('[Cron] No expired commitments found.');
    }
  } catch (error) {
    console.error('[Cron] Error checking expired commitments:', error);
  }
});

// Start server
app.listen(port, () => {
  console.log(`HabitContract backend listening on port ${port}`);
});
