import express from 'express';
import request from 'supertest';
import userRouter from '../user';
import { db } from '../../config/firestore';

// Mock firestore
jest.mock('../../config/firestore', () => {
  const getMock = jest.fn();
  const updateMock = jest.fn();
  
  return {
    db: {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: getMock,
          update: updateMock,
        })
      }),
      runTransaction: jest.fn(async (callback) => {
        const transaction = {
          get: getMock,
          update: updateMock,
        };
        return callback(transaction);
      }),
    }
  };
});

// Mock auth middleware to let tests pass
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/user', userRouter);

describe('User Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/user/profile', () => {
    it('should return 404 if user is not found', async () => {
      const mockGet = require('../../config/firestore').db.collection().doc().get;
      mockGet.mockResolvedValueOnce({ exists: false });

      const response = await request(app).get('/api/user/profile');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should return user profile if found', async () => {
      const mockGet = require('../../config/firestore').db.collection().doc().get;
      mockGet.mockResolvedValueOnce({ 
        exists: true,
        id: 'test-user-id',
        data: () => ({
          name: 'Kayra',
          email: 'kayra@test.com',
          avatar: 'http://avatar',
          tier: 'Tier 1',
          passes: 5
        })
      });

      const response = await request(app).get('/api/user/profile');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('test-user-id');
      expect(response.body.name).toBe('Kayra');
      expect(response.body.email).toBe('kayra@test.com');
      expect(response.body.passes).toBe(5);
      // notificationSettings fallback to defaults
      expect(response.body.notificationSettings.dailyReminder).toBe(true);
    });

    it('should return 500 on internal server error', async () => {
      const mockGet = require('../../config/firestore').db.collection().doc().get;
      mockGet.mockRejectedValueOnce(new Error('DB error'));

      const response = await request(app).get('/api/user/profile');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('PUT /api/user/profile', () => {
    it('should return 400 if no parameters are provided', async () => {
      const response = await request(app).put('/api/user/profile').send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No update parameters provided');
    });

    it('should update user profile successfully', async () => {
      const mockUpdate = require('../../config/firestore').db.collection().doc().update;
      mockUpdate.mockResolvedValueOnce();

      const response = await request(app).put('/api/user/profile').send({
        name: 'New Name ',
        tier: 'Tier 2',
        notificationSettings: { dailyReminder: false }
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile updated successfully');
      expect(mockUpdate).toHaveBeenCalledWith({
        name: 'New Name',
        tier: 'Tier 2',
        notificationSettings: { dailyReminder: false }
      });
    });

    it('should return 500 on internal server error', async () => {
      const mockUpdate = require('../../config/firestore').db.collection().doc().update;
      mockUpdate.mockRejectedValueOnce(new Error('DB error'));

      const response = await request(app).put('/api/user/profile').send({ name: 'Test' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('PUT /api/user/avatar', () => {
    it('should return 400 if avatar is not provided', async () => {
      const response = await request(app).put('/api/user/avatar').send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Avatar parameter is required');
    });

    it('should update avatar successfully', async () => {
      const mockUpdate = require('../../config/firestore').db.collection().doc().update;
      mockUpdate.mockResolvedValueOnce();

      const response = await request(app).put('/api/user/avatar').send({ avatar: 'base64data' });

      expect(response.status).toBe(200);
      expect(response.body.avatar).toBe('base64data');
      expect(mockUpdate).toHaveBeenCalledWith({ avatar: 'base64data' });
    });

    it('should return 500 on internal server error', async () => {
      const mockUpdate = require('../../config/firestore').db.collection().doc().update;
      mockUpdate.mockRejectedValueOnce(new Error('DB error'));

      const response = await request(app).put('/api/user/avatar').send({ avatar: 'test' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/user/purchase-passes', () => {
    it('should return 400 if quantity is missing or invalid', async () => {
      const response = await request(app).post('/api/user/purchase-passes').send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid pass quantity');
    });

    it('should successfully buy passes and increment user balance', async () => {
      const mockGet = require('../../config/firestore').db.collection().doc().get;
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ name: 'Kayra', passes: 3 })
      });

      const mockUpdate = require('../../config/firestore').db.collection().doc().update;
      mockUpdate.mockResolvedValueOnce();

      const response = await request(app).post('/api/user/purchase-passes').send({ quantity: 5 });
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.passes).toBe(8);
    });
  });
});
