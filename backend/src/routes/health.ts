import { Router } from 'express';
import { db } from '../config/firestore';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Log/Update daily health metric (used by simulator or client sync)
router.post('/log', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    const { metricType, dateString, value } = req.body;

    if (!metricType || !dateString || value === undefined) {
      return res.status(400).json({ error: 'metricType, dateString, and value are required' });
    }

    const logId = `${userId}_${dateString}_${metricType}`;
    const logRef = db.collection('health_logs').doc(logId);

    const logData = {
      userId,
      metricType,
      dateString,
      value: Number(value),
      updatedAt: new Date().toISOString(),
    };

    await logRef.set(logData, { merge: true });

    return res.status(200).json({ message: 'Health log saved successfully', log: logData });
  } catch (err: any) {
    console.error('Error saving health log:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get health logs for a date range and metric
router.get('/range', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    const { metricType, startDate, endDate } = req.query;

    if (!metricType || !startDate || !endDate) {
      return res.status(400).json({ error: 'metricType, startDate, and endDate are required' });
    }

    const logsSnapshot = await db
      .collection('health_logs')
      .where('userId', '==', userId)
      .where('metricType', '==', String(metricType))
      .where('dateString', '>=', String(startDate))
      .where('dateString', '<=', String(endDate))
      .get();

    const logs: any[] = [];
    logsSnapshot.forEach((doc) => {
      logs.push(doc.data());
    });

    // Sort logs by dateString ascending
    logs.sort((a, b) => a.dateString.localeCompare(b.dateString));

    return res.status(200).json(logs);
  } catch (err: any) {
    console.error('Error fetching health logs range:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
