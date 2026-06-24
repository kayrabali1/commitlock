import express from 'express';
import request from 'supertest';
import stripeRouter from '../stripe';
import { db } from '../../config/firestore';

// Mock firestore
jest.mock('../../config/firestore', () => {
  const getMock = jest.fn();
  const setMock = jest.fn();
  const updateMock = jest.fn();
  
  return {
    db: {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: getMock,
          set: setMock,
          update: updateMock,
        })
      })
    }
  };
});

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_mock123' })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ url: 'http://mock-stripe-url' })
      }
    },
    webhooks: {
      constructEvent: jest.fn()
    }
  }));
});

// Mock auth middleware to let tests pass without a real Firebase token
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    // Inject a fake user ID for the setup session test
    req.userId = 'test-user-id';
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/stripe', stripeRouter);

describe('Stripe Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/stripe/create-setup-session', () => {
    it('should return 404 if user is not found', async () => {
      // Mock user doc does not exist
      const mockGet = require('../../config/firestore').db.collection().doc().get;
      mockGet.mockResolvedValueOnce({ exists: false });

      const response = await request(app)
        .post('/api/stripe/create-setup-session')
        .send();

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should create a local session and return url if user exists', async () => {
      const mockGet = require('../../config/firestore').db.collection().doc().get;
      const mockSet = require('../../config/firestore').db.collection().doc().set;
      
      mockGet.mockResolvedValueOnce({ 
        exists: true, 
        data: () => ({ email: 'test@example.com' }) 
      });

      const response = await request(app)
        .post('/api/stripe/create-setup-session')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.url).toContain('/add-payment?session_id=');
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'test-user-id',
        status: 'pending'
      }));
    });
  });

  describe('POST /api/stripe/mock-save-payment', () => {
    it('should return 400 if session ID is missing', async () => {
      const response = await request(app)
        .post('/api/stripe/mock-save-payment')
        .send({ paymentMethod: 'card' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing session ID');
    });

    it('should return 404 if session is not found', async () => {
      const mockGet = require('../../config/firestore').db.collection().doc().get;
      mockGet.mockResolvedValueOnce({ exists: false });

      const response = await request(app)
        .post('/api/stripe/mock-save-payment')
        .send({ sessionId: 'invalid-session', paymentMethod: 'card' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Session not found');
    });

    it('should update user and mark session completed', async () => {
      const mockGet = require('../../config/firestore').db.collection().doc().get;
      const mockUpdate = require('../../config/firestore').db.collection().doc().update;
      
      mockGet.mockResolvedValueOnce({ 
        exists: true,
        data: () => ({ status: 'pending', userId: 'user-123' })
      });

      const response = await request(app)
        .post('/api/stripe/mock-save-payment')
        .send({ sessionId: 'valid-session', paymentMethod: 'paypal' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify user update
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        hasPaymentMethod: true,
        mockPaymentMethod: 'paypal'
      }));

      // Verify session update
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed'
      }));
    });
  });
});
