import { Router, Response } from 'express';
import { db } from '../config/firestore';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Get user profile
router.get('/profile', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data()!;
    return res.status(200).json({
      id: userDoc.id,
      name: userData.name,
      email: userData.email,
      avatar: userData.avatar,
      tier: userData.tier,
      walletBalance: userData.walletBalance,
      notificationSettings: userData.notificationSettings || {
        commitmentReminders: true,
        progressUpdates: true,
        failedCommitments: true,
        weeklyDigest: true,
      },
    });
  } catch (err: any) {
    console.error('Error fetching user profile:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile details or settings
router.put('/profile', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    const { name, tier, notificationSettings } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (tier !== undefined) updateData.tier = tier;
    if (notificationSettings !== undefined) updateData.notificationSettings = notificationSettings;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update parameters provided' });
    }

    await db.collection('users').doc(userId).update(updateData);
    
    return res.status(200).json({ message: 'Profile updated successfully', updates: updateData });
  } catch (err: any) {
    console.error('Error updating user profile:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user avatar
router.put('/avatar', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    const { avatar } = req.body; // Can be a URL, local path, or base64 data URI

    if (avatar === undefined) {
      return res.status(400).json({ error: 'Avatar parameter is required' });
    }

    // In a full production system, we would upload to Google Cloud Storage (GCS)
    // here. For testing and simple storage, saving the image URL or base64 data URI 
    // directly in Firestore user document works perfectly.
    await db.collection('users').doc(userId).update({ avatar });

    return res.status(200).json({ message: 'Avatar updated successfully', avatar });
  } catch (err: any) {
    console.error('Error updating avatar:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user wallet balance (for deposits/withdrawals)
router.put('/wallet', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    const { amount } = req.body; // Amount to add (can be negative to subtract)

    if (amount === undefined || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Valid numeric amount is required' });
    }

    const userRef = db.collection('users').doc(userId);
    
    // Perform transactional update to prevent race conditions
    const newBalance = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const currentBalance = userDoc.data()?.walletBalance || 0;
      const updatedBalance = Math.max(0, currentBalance + amount);
      
      transaction.update(userRef, { walletBalance: updatedBalance });
      return updatedBalance;
    });

    return res.status(200).json({ message: 'Wallet balance updated', walletBalance: newBalance });
  } catch (err: any) {
    console.error('Error updating wallet balance:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
