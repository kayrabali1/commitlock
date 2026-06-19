import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRouter from './routes/auth';
import userRouter from './routes/user';
import commitmentsRouter from './routes/commitments';
import healthRouter from './routes/health';

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
app.use('/api/health', healthRouter);

// Start server
app.listen(port, () => {
  console.log(`HabitContract backend listening on port ${port}`);
});
