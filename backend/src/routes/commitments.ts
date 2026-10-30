import { Router } from 'express';
import { db } from '../config/firestore';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

function isGracePeriodExpired(endDateStr: string): boolean {
  const [year, month, day] = endDateStr.split('-').map(Number);
  const gracePeriodEnd = new Date(Date.UTC(year, month - 1, day + 3, 0, 0, 0, 0));
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

    commitmentsSnapshot.forEach((doc) => {
      const data = doc.data();
      const id = doc.id;
      
      commitments.push({
        id,
        ...data,
      });
    });

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

// Create a new commitment (spends 1 Challenge Pass)
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
    } = req.body;

    if (!metricType || !targetValue || !period || stakeAmount === undefined || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required commitment parameters' });
    }

    const userRef = db.collection('users').doc(userId);
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
      status: 'active',
      createdAt: new Date().toISOString(),
      passesSpent: 1,
    };

    await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new Error('User not found');
      }
      const userData = userSnap.data()!;
      const currentPasses = userData.passes !== undefined ? userData.passes : 3;

      let passField = 'bronzePasses';
      if (Number(stakeAmount) === 4.99 || Number(stakeAmount) === 10) passField = 'silverPasses';
      if (Number(stakeAmount) === 9.99 || Number(stakeAmount) === 20) passField = 'goldPasses';

      const currentTierPasses = userData[passField] !== undefined ? userData[passField] : 0;
      if (currentPasses < 1 || currentTierPasses < 1) {
        throw new Error('insufficient_passes');
      }

      transaction.update(userRef, { 
        passes: Math.max(0, currentPasses - 1),
        [passField]: Math.max(0, currentTierPasses - 1)
      });
      transaction.set(newCommitmentRef, newCommitment);
    });

    return res.status(201).json({
      commitment: {
        id: newCommitmentRef.id,
        ...newCommitment,
      }
    });
  } catch (err: any) {
    console.error('Error creating commitment:', err);
    if (err.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (err.message === 'insufficient_passes') {
      return res.status(400).json({ error: 'insufficient_passes', message: 'You must have at least 1 Challenge Pass to start a commitment.' });
    }
    return res.status(400).json({ error: err.message || 'Internal server error' });
  }
});

// Delete/Cancel an active commitment (refunds spent Challenge Pass)
router.delete('/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    const commitmentId = req.params.id;

    const commitmentRef = db.collection('commitments').doc(commitmentId);
    const userRef = db.collection('users').doc(userId);

    const result = await db.runTransaction(async (transaction) => {
      const commitmentSnap = await transaction.get(commitmentRef);
      if (!commitmentSnap.exists) {
        throw new Error('Commitment not found');
      }
      const commitment = commitmentSnap.data()!;
      if (commitment.userId !== userId) {
        throw new Error('Unauthorized');
      }

      const isActive = commitment.status === 'active';
      if (isActive) {
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists) {
          const userData = userSnap.data()!;
          const currentPasses = userData.passes !== undefined ? userData.passes : 3;

          let passField = 'bronzePasses';
          if (commitment.stakeAmount === 4.99 || commitment.stakeAmount === 10) passField = 'silverPasses';
          if (commitment.stakeAmount === 9.99 || commitment.stakeAmount === 20) passField = 'goldPasses';

          const currentTierPasses = userData[passField] !== undefined ? userData[passField] : 0;

          transaction.update(userRef, { 
            passes: currentPasses + 1,
            [passField]: currentTierPasses + 1
          });
        }
      }

      transaction.delete(commitmentRef);
      return { refunded: isActive };
    });

    return res.status(200).json({ message: 'Commitment deleted successfully', refunded: result.refunded });
  } catch (err: any) {
    console.error('Error deleting commitment:', err);
    if (err.message === 'Commitment not found') {
      return res.status(404).json({ error: 'Commitment not found' });
    }
    if (err.message === 'Unauthorized') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    return res.status(400).json({ error: err.message || 'Internal server error' });
  }
});

// Resolve a commitment (success refunds the pass, failure forfeits it)
router.post('/:id/resolve', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    const commitmentId = req.params.id;
    const { status: clientStatus, performanceData, refundMethod } = req.body;

    if (!clientStatus || !['success', 'failed'].includes(clientStatus)) {
      return res.status(400).json({ error: 'Valid resolution status ("success" or "failed") is required' });
    }

    const commitmentRef = db.collection('commitments').doc(commitmentId);
    const userRef = db.collection('users').doc(userId);

    const commitmentDoc = await commitmentRef.get();
    if (!commitmentDoc.exists) return res.status(404).json({ error: 'Commitment not found' });
    
    const commitment = commitmentDoc.data()!;
    if (commitment.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });
    if (commitment.status !== 'active') return res.status(400).json({ error: 'Commitment is already resolved' });

    // Evaluate performanceData logic safely on backend (only checking dates inside the commitment range if defined)
    let finalStatus = 'failed';
    if (clientStatus === 'success' && Array.isArray(performanceData)) {
      const commitmentLogs = (commitment.startDate && commitment.endDate)
        ? performanceData.filter((d: any) => d.dateString >= commitment.startDate && d.dateString <= commitment.endDate)
        : performanceData;
      const passedAll = commitmentLogs.length > 0 && commitmentLogs.every((d: any) => (Number(d.value) || 0) >= commitment.targetValue);
      if (passedAll) finalStatus = 'success';
    }

    if (finalStatus === 'success' && isGracePeriodExpired(commitment.endDate)) {
      return res.status(400).json({ error: 'Grace period (48 hours) for this commitment has expired' });
    }

    const updates = {
      status: finalStatus,
      resolvedAt: new Date().toISOString(),
      refundMethod: refundMethod || 'pass',
    };

    const updatedCommitment = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(commitmentRef);
      if (!doc.exists) throw new Error('Commitment not found');
      if (doc.data()?.status !== 'active') throw new Error('Commitment is already resolved');
      
      transaction.update(commitmentRef, updates);

      if (finalStatus === 'success') {
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists) {
          const userData = userSnap.data()!;
          const currentPasses = userData.passes !== undefined ? userData.passes : 3;

          let passField = 'bronzePasses';
          if (commitment.stakeAmount === 4.99 || commitment.stakeAmount === 10) passField = 'silverPasses';
          if (commitment.stakeAmount === 9.99 || commitment.stakeAmount === 20) passField = 'goldPasses';

          const currentTierPasses = userData[passField] !== undefined ? userData[passField] : 0;

          transaction.update(userRef, { 
            passes: currentPasses + 1,
            [passField]: currentTierPasses + 1
          });
        }
      }

      return { id: commitmentId, ...doc.data(), ...updates };
    });

    return res.status(200).json(updatedCommitment);
  } catch (err: any) {
    console.error('Error resolving commitment:', err);
    return res.status(400).json({ error: err.message || 'Internal server error' });
  }
});

// Update a commitment (only if not started yet)
router.put('/:id', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    const commitmentId = req.params.id;
    const {
      metricType,
      targetValue,
      period,
      stakeAmount,
      startDate,
      endDate,
    } = req.body;

    const commitmentRef = db.collection('commitments').doc(commitmentId);
    const userRef = db.collection('users').doc(userId);

    const updatedCommitment = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(commitmentRef);
      if (!doc.exists) throw new Error('Commitment not found');
      
      const commitment = doc.data()!;
      if (commitment.userId !== userId) throw new Error('Unauthorized');
      if (commitment.status !== 'active') throw new Error('Commitment is already resolved');
      
      const today = new Date().toISOString().split('T')[0];
      if (commitment.startDate <= today) {
        throw new Error('Cannot edit a commitment that has already started');
      }

      const updates: any = {};
      if (metricType) updates.metricType = metricType;
      if (targetValue) updates.targetValue = Number(targetValue);
      if (period) updates.period = period;
      if (startDate) updates.startDate = startDate;
      if (endDate) updates.endDate = endDate;

      // Handle stakeAmount differences
      if (stakeAmount !== undefined && Number(stakeAmount) !== commitment.stakeAmount) {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) throw new Error('User not found');
        const userData = userSnap.data()!;
        
        const currentPasses = userData.passes !== undefined ? userData.passes : 3;
        
        let oldPassField = 'bronzePasses';
        if (commitment.stakeAmount === 4.99 || commitment.stakeAmount === 10) oldPassField = 'silverPasses';
        if (commitment.stakeAmount === 9.99 || commitment.stakeAmount === 20) oldPassField = 'goldPasses';
        
        let newPassField = 'bronzePasses';
        if (Number(stakeAmount) === 4.99 || Number(stakeAmount) === 10) newPassField = 'silverPasses';
        if (Number(stakeAmount) === 9.99 || Number(stakeAmount) === 20) newPassField = 'goldPasses';

        const oldTierPasses = userData[oldPassField] !== undefined ? userData[oldPassField] : 0;
        const newTierPasses = userData[newPassField] !== undefined ? userData[newPassField] : 0;

        // Refund old
        let updatedPasses = currentPasses + 1;
        let updatedOldTierPasses = oldTierPasses + 1;
        
        // Deduct new
        updatedPasses -= 1;
        let updatedNewTierPasses = (oldPassField === newPassField ? updatedOldTierPasses : newTierPasses) - 1;

        if (updatedPasses < 0 || updatedNewTierPasses < 0) {
           throw new Error('insufficient_passes');
        }

        const userUpdates: any = { passes: updatedPasses };
        if (oldPassField === newPassField) {
           userUpdates[oldPassField] = updatedNewTierPasses;
        } else {
           userUpdates[oldPassField] = updatedOldTierPasses;
           userUpdates[newPassField] = updatedNewTierPasses;
        }

        transaction.update(userRef, userUpdates);
        updates.stakeAmount = Number(stakeAmount);
      }

      transaction.update(commitmentRef, updates);
      return { id: commitmentId, ...commitment, ...updates };
    });

    return res.status(200).json({ commitment: updatedCommitment });
  } catch (err: any) {
    console.error('Error updating commitment:', err);
    if (err.message === 'Commitment not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Unauthorized') return res.status(403).json({ error: err.message });
    if (err.message === 'insufficient_passes') return res.status(400).json({ error: 'insufficient_passes', message: 'You must have at least 1 Challenge Pass to start a commitment.' });
    return res.status(400).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
