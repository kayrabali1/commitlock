import { Router } from 'express';
import { db } from '../config/firestore';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

function isGracePeriodExpired(endDateStr: string): boolean {
  const [year, month, day] = endDateStr.split('-').map(Number);
  const gracePeriodEnd = new Date(year, month - 1, day + 3, 0, 0, 0, 0);
  const now = new Date();
  return now > gracePeriodEnd;
}

// Get all commitments (active and history) for the authenticated user
router.get('/', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    
    const commitmentsSnapshot = await db
      .collection('commitments')
      .where('userId', '==', userId)
      .get();

    const commitments: any[] = [];
    const restoreIdsToUpdate: string[] = [];

    commitmentsSnapshot.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;
      
      // Auto-restore previously auto-failed commitments due to grace period
      // so the user can manually archive them from the Active tab
      if (data.status === 'failed' && data.failureReason === 'grace_period_expired') {
        restoreIdsToUpdate.push(id);
        commitments.push({
          id,
          ...data,
          status: 'active',
          failureReason: null,
          resolvedAt: null,
        });
      } else {
        commitments.push({
          id,
          ...data,
        });
      }
    });

    // Lazy restore in batch
    if (restoreIdsToUpdate.length > 0) {
      const batch = db.batch();
      restoreIdsToUpdate.forEach((id) => {
        const ref = db.collection('commitments').doc(id);
        batch.update(ref, {
          status: 'active',
          failureReason: null,
          resolvedAt: null,
        });
      });
      await batch.commit();
      console.log(`Lazy-restored ${restoreIdsToUpdate.length} expired commitments to active.`);
    }

    // Sort commitments by createdAt descending in-memory to avoid requiring a composite Firestore index
    commitments.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return res.status(200).json(commitments);
  } catch (err: any) {
    console.error('Error fetching commitments:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new commitment (deducts stake from wallet)
router.post('/', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    const {
      metricType,
      targetValue,
      period,
      stakeAmount,
      startDate,
      endDate,
      targetScope,
    } = req.body;

    if (!metricType || !targetValue || !period || stakeAmount === undefined || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required commitment parameters' });
    }

    const commitmentsRef = db.collection('commitments');
    const newCommitmentRef = commitmentsRef.doc();
    const newCommitment = {
      userId,
      metricType,
      targetValue: Number(targetValue),
      period,
      stakeAmount: Number(stakeAmount),
      startDate,
      endDate,
      targetScope: targetScope || 'daily',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await newCommitmentRef.set(newCommitment);

    return res.status(201).json({
      commitment: {
        id: newCommitmentRef.id,
        ...newCommitment,
      }
    });
  } catch (err: any) {
    console.error('Error creating commitment:', err);
    return res.status(400).json({ error: err.message || 'Internal server error' });
  }
});

// Delete/Cancel an active commitment (refunds stake to original payment method)
router.delete('/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    const commitmentId = req.params.id;

    const commitmentRef = db.collection('commitments').doc(commitmentId);

    const result = await db.runTransaction(async (transaction) => {
      const commitmentDoc = await transaction.get(commitmentRef);
      if (!commitmentDoc.exists) {
        throw new Error('Commitment not found');
      }

      const commitment = commitmentDoc.data()!;
      if (commitment.userId !== userId) {
        throw new Error('Unauthorized');
      }

      transaction.delete(commitmentRef);

      return {
        refunded: commitment.status === 'active',
        refundAmount: commitment.stakeAmount,
      };
    });

    return res.status(200).json({ message: 'Commitment deleted successfully', ...result });
  } catch (err: any) {
    console.error('Error deleting commitment:', err);
    return res.status(400).json({ error: err.message || 'Internal server error' });
  }
});

// Resolve a commitment (success refunds the stake, failure forfeits it)
router.post('/:id/resolve', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    const commitmentId = req.params.id;
    const { status, performanceData, refundMethod } = req.body;

    if (!status || !['success', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Valid resolution status ("success" or "failed") is required' });
    }

    const commitmentRef = db.collection('commitments').doc(commitmentId);

    const updatedCommitment = await db.runTransaction(async (transaction) => {
      const commitmentDoc = await transaction.get(commitmentRef);
      if (!commitmentDoc.exists) {
        throw new Error('Commitment not found');
      }

      const commitment = commitmentDoc.data()!;
      if (commitment.userId !== userId) {
        throw new Error('Unauthorized');
      }

      if (commitment.status !== 'active') {
        throw new Error('Commitment is already resolved');
      }

      if (status === 'success' && isGracePeriodExpired(commitment.endDate)) {
        throw new Error('Grace period (48 hours) for this commitment has expired');
      }

      // Update commitment status
      const updates = {
        status,
        performanceData: performanceData || [],
        resolvedAt: new Date().toISOString(),
        refundMethod: refundMethod || 'bank',
      };

      transaction.update(commitmentRef, updates);

      return {
        id: commitmentId,
        ...commitment,
        ...updates,
      };
    });

    return res.status(200).json(updatedCommitment);
  } catch (err: any) {
    console.error('Error resolving commitment:', err);
    return res.status(400).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
