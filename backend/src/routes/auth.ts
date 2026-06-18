import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/firestore';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'commitlock_secret_key_testing_499812';

// Register a new user
router.post('/register', async (req: any, res: any) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const normEmail = email.toLowerCase().trim();
    const normName = name.trim();

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const usersRef = db.collection('users');
    const existingQuery = await usersRef.where('email', '==', normEmail).get();

    if (!existingQuery.empty) {
      return res.status(400).json({ error: 'An account with this email address already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Default avatar
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(normName)}&background=8B5CF6&color=fff&bold=true`;

    const newUser = {
      name: normName,
      email: normEmail,
      passwordHash,
      avatar,
      tier: 'High Accountability (Tier 3)',
      walletBalance: 100.0, // Default signup credit
      createdAt: new Date().toISOString(),
    };

    const docRef = await usersRef.add(newUser);
    const userId = docRef.id;

    // Create JWT token
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });

    return res.status(201).json({
      token,
      user: {
        id: userId,
        name: normName,
        email: normEmail,
        avatar,
        tier: newUser.tier,
        walletBalance: newUser.walletBalance,
        provider: 'email',
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// User login
router.post('/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normEmail = email.toLowerCase().trim();

    // Check default demo user if the database is empty or user is requesting it
    if (normEmail === 'demo@commitlock.com' && password === 'password') {
      const usersRef = db.collection('users');
      const demoQuery = await usersRef.where('email', '==', 'demo@commitlock.com').get();
      
      let userId: string;
      let userDoc: any;

      if (demoQuery.empty) {
        // Create the demo user profile in Firestore if it doesn't exist yet
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password', salt);
        userDoc = {
          name: 'Kayra Bali',
          email: 'demo@commitlock.com',
          passwordHash,
          avatar: 'https://ui-avatars.com/api/?name=Kayra+Bali&background=8B5CF6&color=fff&bold=true',
          tier: 'High Accountability (Tier 3)',
          walletBalance: 100.0,
          createdAt: new Date().toISOString(),
        };
        const docRef = await usersRef.add(userDoc);
        userId = docRef.id;
      } else {
        const doc = demoQuery.docs[0];
        userId = doc.id;
        userDoc = doc.data();
      }

      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
      return res.status(200).json({
        token,
        user: {
          id: userId,
          name: userDoc.name,
          email: userDoc.email,
          avatar: userDoc.avatar,
          tier: userDoc.tier,
          walletBalance: userDoc.walletBalance,
          provider: 'email',
        },
      });
    }

    // Normal login query
    const usersRef = db.collection('users');
    const userQuery = await usersRef.where('email', '==', normEmail).get();

    if (userQuery.empty) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const userDoc = userQuery.docs[0];
    const user = userDoc.data();

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: userDoc.id }, JWT_SECRET, { expiresIn: '30d' });

    return res.status(200).json({
      token,
      user: {
        id: userDoc.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        tier: user.tier,
        walletBalance: user.walletBalance,
        provider: 'email',
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Validate JWT token and return user profile
router.get('/validate', authenticateToken as any, async (req: AuthenticatedRequest, res: any) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ error: 'Invalid token payload' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const user = userDoc.data()!;
    return res.status(200).json({
      user: {
        id: userDoc.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        tier: user.tier,
        walletBalance: user.walletBalance,
        provider: 'email',
      },
    });
  } catch (err: any) {
    console.error('Token validation error:', err);
    return res.status(500).json({ error: 'Internal server error validating token' });
  }
});

export default router;
