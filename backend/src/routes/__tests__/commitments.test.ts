import express from 'express';
import request from 'supertest';
import commitmentsRouter from '../commitments';
import { db } from '../../config/firestore';

// Mock firestore
jest.mock('../../config/firestore', () => {
  const getMock = jest.fn();
  const setMock = jest.fn();
  const updateMock = jest.fn();
  const deleteMock = jest.fn();
  const whereMock = jest.fn();
  
  const collectionMock = jest.fn().mockReturnValue({
    doc: jest.fn().mockReturnValue({
      get: getMock,
      set: setMock,
      update: updateMock,
      delete: deleteMock,
      id: 'mock-doc-id',
    }),
    where: whereMock,
  });

  whereMock.mockReturnValue({ get: getMock });

  return {
    db: {
      collection: collectionMock,
      runTransaction: jest.fn(async (callback) => {
        const transaction = {
          get: getMock,
          update: updateMock,
          set: setMock,
          delete: deleteMock,
        };
        return callback(transaction);
      }),
    }
  };
});

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.userId = 'user-123';
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/commitments', commitmentsRouter);

describe('Commitments Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/commitments', () => {
    it('should return 500 on DB error', async () => {
      const mockGet = require('../../config/firestore').db.collection().where().get;
      mockGet.mockRejectedValueOnce(new Error('DB Error'));

      const response = await request(app).get('/api/commitments');
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should fetch and return sorted commitments', async () => {
      const mockGet = require('../../config/firestore').db.collection().where().get;
      const mockDocs = [
        { id: 'c1', data: () => ({ createdAt: '2026-06-23T10:00:00.000Z' }) },
        { id: 'c2', data: () => ({ createdAt: '2026-06-24T10:00:00.000Z' }) },
        { id: 'c3', data: () => ({ }) } // no createdAt test
      ];
      mockGet.mockResolvedValue({
        forEach: (cb: any) => mockDocs.forEach(cb)
      });

      const response = await request(app).get('/api/commitments');
      expect(response.status).toBe(200);
      expect(response.body.length).toBe(3);
      // Ensure sorted desc (c2 should be first, then c1, then c3)
      expect(response.body[0].id).toBe('c2');
      expect(response.body[1].id).toBe('c1');
      expect(response.body[2].id).toBe('c3');
    });
  });

  describe('POST /api/commitments', () => {
    it('should return 400 if required parameters are missing', async () => {
      const response = await request(app).post('/api/commitments').send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required commitment parameters');
    });

    it('should return 404 if user is not found', async () => {
      const mockGet = require('../../config/firestore').db.collection().doc().get;
      mockGet.mockRejectedValueOnce(new Error('User not found'));

      const response = await request(app).post('/api/commitments').send({
        metricType: 'steps',
        targetValue: 10000,
        period: 7,
        stakeAmount: 50,
        startDate: '2026-06-24',
        endDate: '2026-06-30'
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should return 400 if user has insufficient passes', async () => {
      const getMock = require('../../config/firestore').db.collection().doc().get;
      getMock.mockResolvedValue({
        exists: true,
        data: () => ({ name: 'Kayra', passes: 0 })
      });

      const response = await request(app).post('/api/commitments').send({
        metricType: 'steps',
        targetValue: 10000,
        period: 7,
        stakeAmount: 50,
        startDate: '2026-06-24',
        endDate: '2026-06-30'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('insufficient_passes');
    });

    it('should return 201, deduct a pass, and create commitment successfully', async () => {
      const mockGet = require('../../config/firestore').db.collection().doc().get;
      mockGet.mockResolvedValue({ 
        exists: true, 
        data: () => ({ name: 'Kayra', passes: 3, bronzePasses: 1 }) 
      });

      const mockSet = require('../../config/firestore').db.collection().doc().set;
      const mockUpdate = require('../../config/firestore').db.collection().doc().update;

      const response = await request(app).post('/api/commitments').send({
        metricType: 'steps',
        targetValue: 10000,
        period: 7,
        stakeAmount: 50,
        startDate: '2026-06-24',
        endDate: '2026-06-30'
      });

      expect(response.status).toBe(201);
      expect(response.body.commitment.id).toBeDefined();
      expect(response.body.commitment.passesSpent).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith(expect.anything(), { passes: 2, bronzePasses: 0 });
      expect(mockSet).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/commitments/:id', () => {
    it('should return 404 if commitment not found', async () => {
      const mockDocGet = require('../../config/firestore').db.collection().doc().get;
      mockDocGet.mockRejectedValueOnce(new Error('Commitment not found'));

      const response = await request(app).delete('/api/commitments/mock-doc');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Commitment not found');
    });

    it('should return 403 if user is unauthorized', async () => {
      const mockDocGet = require('../../config/firestore').db.collection().doc().get;
      mockDocGet.mockRejectedValueOnce(new Error('Unauthorized'));

      const response = await request(app).delete('/api/commitments/mock-doc');
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should successfully delete an active commitment and refund 1 pass', async () => {
      const mockDocGet = require('../../config/firestore').db.collection().doc().get;
      // Setup transaction mocks: first resolve commitment then resolve user
      mockDocGet
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ userId: 'user-123', status: 'active', passesSpent: 1 })
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => ({ name: 'Kayra', passes: 2, bronzePasses: 1 })
        });
        
      const mockDocDelete = require('../../config/firestore').db.collection().doc().delete;
      const mockDocUpdate = require('../../config/firestore').db.collection().doc().update;

      const response = await request(app).delete('/api/commitments/mock-doc');
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Commitment deleted successfully');
      expect(response.body.refunded).toBe(true);
      expect(mockDocDelete).toHaveBeenCalled();
      expect(mockDocUpdate).toHaveBeenCalledWith(expect.anything(), { passes: 3, bronzePasses: 2 });
    });

    it('should successfully delete an inactive commitment and NOT refund pass', async () => {
      const mockDocGet = require('../../config/firestore').db.collection().doc().get;
      mockDocGet.mockResolvedValueOnce({ 
        exists: true,
        data: () => ({ userId: 'user-123', status: 'failed' })
      });
      const mockDocUpdate = require('../../config/firestore').db.collection().doc().update;

      const response = await request(app).delete('/api/commitments/mock-doc');
      expect(response.status).toBe(200);
      expect(response.body.refunded).toBe(false);
      expect(mockDocUpdate).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/commitments/:id/resolve', () => {
    it('should return 400 if valid status is missing', async () => {
      const response = await request(app).post('/api/commitments/mock-id/resolve').send({ status: 'invalid' });
      expect(response.status).toBe(400);
    });

    it('should return 404 if commitment not found', async () => {
      const mockDocGet = require('../../config/firestore').db.collection().doc().get;
      mockDocGet.mockResolvedValueOnce({ exists: false });

      const response = await request(app).post('/api/commitments/mock-id/resolve').send({ status: 'success' });
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Commitment not found');
    });

    it('should return 403 if user unauthorized', async () => {
      const mockDocGet = require('../../config/firestore').db.collection().doc().get;
      mockDocGet.mockResolvedValueOnce({ 
        exists: true,
        data: () => ({ userId: 'diff' })
      });

      const response = await request(app).post('/api/commitments/mock-id/resolve').send({ status: 'success' });
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 400 if commitment already resolved', async () => {
      const mockDocGet = require('../../config/firestore').db.collection().doc().get;
      mockDocGet.mockResolvedValueOnce({ 
        exists: true,
        data: () => ({ userId: 'user-123', status: 'success' })
      });

      const response = await request(app).post('/api/commitments/mock-id/resolve').send({ status: 'success' });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Commitment is already resolved');
    });

    it('should return 400 if grace period expired on success', async () => {
      const mockDocGet = require('../../config/firestore').db.collection().doc().get;
      mockDocGet.mockResolvedValueOnce({ 
        exists: true,
        data: () => ({ userId: 'user-123', status: 'active', endDate: '2020-01-01', targetValue: 10 })
      });

      const response = await request(app).post('/api/commitments/mock-id/resolve').send({ status: 'success', performanceData: [{ value: 10 }] });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Grace period (48 hours) for this commitment has expired');
    });

    it('should update commitment status to failed and NOT increment passes', async () => {
      const mockDocGet = require('../../config/firestore').db.collection().doc().get;
      mockDocGet.mockResolvedValueOnce({ 
        exists: true,
        data: () => ({ userId: 'user-123', status: 'active', endDate: '2020-01-01' })
      });

      const transactionMock = {
        get: jest.fn()
          .mockResolvedValueOnce({ exists: true, data: () => ({ status: 'active', userId: 'user-123' }) }),
        update: jest.fn()
      };
      require('../../config/firestore').db.runTransaction.mockImplementationOnce(async (cb: any) => await cb(transactionMock));

      const response = await request(app).post('/api/commitments/mock-id/resolve').send({ status: 'failed' });
      expect(response.status).toBe(200);
      expect(transactionMock.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'failed' }));
      // passes should not be updated (no second update call)
      expect(transactionMock.update).toHaveBeenCalledTimes(1);
    });

    it('should update status to success and increment user passes', async () => {
      const now = new Date();
      const mockDocGet = require('../../config/firestore').db.collection().doc().get;
      mockDocGet.mockResolvedValueOnce({ 
        exists: true,
        data: () => ({ userId: 'user-123', status: 'active', endDate: `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`, targetValue: 10 })
      });

      const transactionMock = {
        get: jest.fn()
          .mockResolvedValueOnce({ exists: true, data: () => ({ status: 'active', userId: 'user-123' }) })
          .mockResolvedValueOnce({ exists: true, data: () => ({ name: 'Kayra', passes: 2, bronzePasses: 1 }) }),
        update: jest.fn()
      };
      require('../../config/firestore').db.runTransaction.mockImplementationOnce(async (cb: any) => await cb(transactionMock));

      const response = await request(app).post('/api/commitments/mock-id/resolve').send({ status: 'success', performanceData: [{ value: 10 }] });
      expect(response.status).toBe(200);
      expect(transactionMock.update).toHaveBeenNthCalledWith(1, expect.anything(), expect.objectContaining({ status: 'success' }));
      expect(transactionMock.update).toHaveBeenNthCalledWith(2, expect.anything(), { passes: 3, bronzePasses: 2 });
    });
  });
});
