import { Router } from 'express';
import { db } from '../config/firestore';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get all commitments (active and history) for the authenticated user
router.get('/', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    
    const commitmentsSnapshot = await db
      .collection('commitments')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const commitments: any[] = [];
    commitmentsSnapshot.forEach((doc) => {
      const data = doc.data();
      commitments.push({
        id: doc.id,
        ...data,
      });
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

    const userRef = db.collection('users').doc(userId);
    const commitmentsRef = db.collection('commitments');

    // Run transaction to check/deduct wallet balance and create commitment
    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const balance = userDoc.data()?.walletBalance || 0;
      if (balance < stakeAmount) {
        throw new Error('Insufficient wallet balance to stake this commitment');
      }

      // Deduct balance
      const newBalance = balance - stakeAmount;
      transaction.update(userRef, { walletBalance: newBalance });

      // Create commitment document reference
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

      transaction.set(newCommitmentRef, newCommitment);

      return {
        commitment: {
          id: newCommitmentRef.id,
          ...newCommitment,
        },
        walletBalance: newBalance,
      };
    });

    return res.status(201).json(result);
  } catch (err: any) {
    console.error('Error creating commitment:', err);
    return res.status(400).json({ error: err.message || 'Internal server error' });
  }
});

// Delete/Cancel an active commitment (refunds stake)
router.delete('/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    const commitmentId = req.params.id;

    const commitmentRef = db.collection('commitments').doc(commitmentId);
    const userRef = db.collection('users').doc(userId);

    const result = await db.runTransaction(async (transaction) => {
      const commitmentDoc = await transaction.get(commitmentRef);
      if (!commitmentDoc.exists) {
        throw new Error('Commitment not found');
      }

      const commitment = commitmentDoc.data()!;
      if (commitment.userId !== userId) {
        throw new Error('Unauthorized');
      }

      let updatedBalance = 0;
      if (commitment.status === 'active') {
        const userDoc = await transaction.get(userRef);
        const currentBalance = userDoc.data()?.walletBalance || 0;
        updatedBalance = currentBalance + commitment.stakeAmount;
        transaction.update(userRef, { walletBalance: updatedBalance });
      }

      transaction.delete(commitmentRef);

      return {
        refunded: commitment.status === 'active',
        refundAmount: commitment.stakeAmount,
        walletBalance: updatedBalance,
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
    const { status, performanceData } = req.body;

    if (!status || !['success', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'Valid resolution status ("success" or "failed") is required' });
    }

    const commitmentRef = db.collection('commitments').doc(commitmentId);
    const userRef = db.collection('users').doc(userId);

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

      // If success, refund the stake
      let userBalance = 0;
      if (status === 'success') {
        const userDoc = await transaction.get(userRef);
        const currentBalance = userDoc.data()?.walletBalance || 0;
        userBalance = currentBalance + commitment.stakeAmount;
        transaction.update(userRef, { walletBalance: userBalance });
      } else {
        const userDoc = await transaction.get(userRef);
        userBalance = userDoc.data()?.walletBalance || 0;
      }

      // Update commitment status
      const updates = {
        status,
        performanceData: performanceData || [],
        resolvedAt: new Date().toISOString(),
      };

      transaction.update(commitmentRef, updates);

      return {
        id: commitmentId,
        ...commitment,
        ...updates,
        walletBalance: userBalance,
      };
    });

    return res.status(200).json(updatedCommitment);
  } catch (err: any) {
    console.error('Error resolving commitment:', err);
    return res.status(400).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
