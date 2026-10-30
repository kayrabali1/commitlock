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

    // One-time migration for legacy users without tier-specific fields
    const hasTierFields =
      userData.bronzePasses !== undefined ||
      userData.silverPasses !== undefined ||
      userData.goldPasses !== undefined;

    let bronzePasses = userData.bronzePasses ?? 0;
    let silverPasses = userData.silverPasses ?? 0;
    let goldPasses = userData.goldPasses ?? 0;

    if (!hasTierFields) {
      const totalPasses = typeof userData.passes === 'number' ? userData.passes : 0;
      bronzePasses = totalPasses >= 1 ? 1 : 0;
      silverPasses = totalPasses >= 2 ? 1 : 0;
      goldPasses = totalPasses >= 3 ? 1 : 0;

      try {
        await db.collection('users').doc(userId).update({ bronzePasses, silverPasses, goldPasses });
      } catch (e) {
        console.error(`[Migration] Failed to write tier passes for user ${userId}:`, e);
      }
    }

    return res.status(200).json({
      id: userDoc.id,
      name: userData.name,
      email: userData.email,
      avatar: userData.avatar,
      tier: userData.tier,
      passes: userData.passes !== undefined ? userData.passes : 3,
      bronzePasses,
      silverPasses,
      goldPasses,
      notificationSettings: userData.notificationSettings || {
        dailyReminder: true,
        statusUpdates: true,
        stakeAlerts: true,
        weeklyReport: false,
        gracePeriodSync: true,
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

// Purchase passes (Simulated In-App Purchase)
router.post('/purchase-passes', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    const { quantity, tier } = req.body;

    if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid pass quantity' });
    }

    const userRef = db.collection('users').doc(userId);
    
    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User not found');
      }
      const userData = userDoc.data()!;
      const currentPasses = (userData.passes !== undefined && typeof userData.passes === 'number' && !isNaN(userData.passes)) ? userData.passes : 0;
      const currentBronze = (userData.bronzePasses !== undefined && typeof userData.bronzePasses === 'number') ? userData.bronzePasses : 0;
      const currentSilver = (userData.silverPasses !== undefined && typeof userData.silverPasses === 'number') ? userData.silverPasses : 0;
      const currentGold = (userData.goldPasses !== undefined && typeof userData.goldPasses === 'number') ? userData.goldPasses : 0;

      let incrementBronze = 0;
      let incrementSilver = 0;
      let incrementGold = 0;
      if (quantity === 3) {
        incrementBronze = 1;
        incrementSilver = 1;
        incrementGold = 1;
      } else if (tier === 'bronze' || tier === '1.99') {
        incrementBronze = quantity;
      } else if (tier === 'silver' || tier === '4.99') {
        incrementSilver = quantity;
      } else if (tier === 'gold' || tier === '9.99') {
        incrementGold = quantity;
      }

      const updatedPasses = currentPasses + quantity;
      const updatedBronze = currentBronze + incrementBronze;
      const updatedSilver = currentSilver + incrementSilver;
      const updatedGold = currentGold + incrementGold;

      transaction.update(userRef, { 
        passes: updatedPasses,
        bronzePasses: updatedBronze,
        silverPasses: updatedSilver,
        goldPasses: updatedGold
      });
      return { passes: updatedPasses, bronzePasses: updatedBronze, silverPasses: updatedSilver, goldPasses: updatedGold };
    });

    console.log(`User ${userId} successfully purchased ${quantity} passes. New balance: ${result.passes}`);
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    console.error('Error purchasing passes:', err);
    if (err.message === 'User not found') {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// Reset Sandbox (Clears all commitments and zeros passes)
router.post('/reset-sandbox', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId!;
    
    // Fetch all commitments for user
    const commitmentsSnapshot = await db.collection('commitments').where('userId', '==', userId).get();
    
    const batch = db.batch();
    
    // Delete all commitments (both active and history)
    commitmentsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Zero out all passes
    const userRef = db.collection('users').doc(userId);
    batch.update(userRef, {
      passes: 0,
      bronzePasses: 0,
      silverPasses: 0,
      goldPasses: 0
    });

    await batch.commit();

    return res.status(200).json({ success: true, message: 'Sandbox completely reset' });
  } catch (err: any) {
    console.error('Error resetting sandbox:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
