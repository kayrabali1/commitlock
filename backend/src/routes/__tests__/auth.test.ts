import express from 'express';
import request from 'supertest';
import authRouter from '../auth';
import { db } from '../../config/firestore';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test_secret';

// Mock firestore
jest.mock('../../config/firestore', () => {
  const getMock = jest.fn();
  const setMock = jest.fn();
  const updateMock = jest.fn();
  const addMock = jest.fn();
  const whereMock = jest.fn();
  
  const collectionMock = jest.fn().mockReturnValue({
    doc: jest.fn().mockReturnValue({
      get: getMock,
      set: setMock,
      update: updateMock,
    }),
    add: addMock,
    where: whereMock,
  });

  // where returns this so we can chain get
  whereMock.mockReturnValue({
    get: getMock
  });

  return {
    db: {
      collection: collectionMock,
      batch: jest.fn().mockReturnValue({
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(true)
      })
    }
  };
});

// Mock apple-signin-auth
jest.mock('apple-signin-auth', () => ({
  verifyIdToken: jest.fn()
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mockGet = require('../../config/firestore').db.collection().where().get;
    const mockAdd = require('../../config/firestore').db.collection().add;
    const mockDocGet = require('../../config/firestore').db.collection().doc().get;
    const mockDocUpdate = require('../../config/firestore').db.collection().doc().update;
    if (mockGet.mockReset) mockGet.mockReset();
    if (mockAdd.mockReset) mockAdd.mockReset();
    if (mockDocGet.mockReset) mockDocGet.mockReset();
    if (mockDocUpdate.mockReset) mockDocUpdate.mockReset();
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 if required fields are missing', async () => {
      const response = await request(app).post('/api/auth/register').send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name, email, and password are required');
    });

    it('should return 400 if password is too short', async () => {
      const response = await request(app).post('/api/auth/register').send({
        name: 'Test',
        email: 'test@example.com',
        password: '123'
      });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password must be at least 6 characters long');
    });

    it('should return 400 if email already exists', async () => {
      const mockGet = require('../../config/firestore').db.collection().where().get;
      mockGet.mockResolvedValueOnce({ empty: false }); // User exists

      const response = await request(app).post('/api/auth/register').send({
        name: 'Test',
        email: 'test@example.com',
        password: 'password123'
      });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('An account with this email address already exists');
    });

    it('should create a user and return a token', async () => {
      const mockGet = require('../../config/firestore').db.collection().where().get;
      const mockAdd = require('../../config/firestore').db.collection().add;
      
      mockGet.mockResolvedValueOnce({ empty: true }); // User does not exist
      mockAdd.mockResolvedValueOnce({ id: 'new-user-id' });

      const response = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });

      expect(response.status).toBe(201);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.name).toBe('Test User');
      expect(response.body.user.id).toBe('new-user-id');
      expect(mockAdd).toHaveBeenCalled();
    });

    it('should return 500 on internal server error', async () => {
      const mockGet = require('../../config/firestore').db.collection().where().get;
      mockGet.mockRejectedValueOnce(new Error('DB Error'));

      const response = await request(app).post('/api/auth/register').send({
        name: 'Test',
        email: 'test@example.com',
        password: 'password123'
      });
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error during registration');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if email or password missing', async () => {
      const response = await request(app).post('/api/auth/login').send({ email: 'test@example.com' });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });

    it('should return 400 if user does not exist', async () => {
      const mockGet = require('../../config/firestore').db.collection().where().get;
      mockGet.mockResolvedValueOnce({ empty: true });

      const response = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'password'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return 400 if password does not match', async () => {
      const mockGet = require('../../config/firestore').db.collection().where().get;
      
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('correctpassword', salt);

      mockGet.mockResolvedValueOnce({ 
        empty: false,
        docs: [{
          id: 'user-id',
          data: () => ({ passwordHash: hash })
        }]
      });

      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should return token if credentials are valid', async () => {
      const mockGet = require('../../config/firestore').db.collection().where().get;
      
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('correctpassword', salt);

      mockGet.mockResolvedValueOnce({ 
        empty: false,
        docs: [{
          id: 'user-id',
          data: () => ({ 
            email: 'test@example.com',
            name: 'Test',
            passwordHash: hash 
          })
        }]
      });

      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'correctpassword'
      });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.id).toBe('user-id');
    });



    it('should return 500 on internal server error', async () => {
      const mockGet = require('../../config/firestore').db.collection().where().get;
      mockGet.mockRejectedValueOnce(new Error('DB Error'));

      const response = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123'
      });
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error during login');
    });
  });

  describe('GET /api/auth/validate', () => {
    it('should validate token and return user', async () => {
      // Mock auth middleware
      const mockGet = require('../../config/firestore').db.collection().doc().get;
      mockGet.mockResolvedValueOnce({
        exists: true,
        id: 'test-user',
        data: () => ({ email: 'test@example.com', name: 'Test' })
      });

      // Provide a valid token so middleware processes it
      const token = jwt.sign({ userId: 'test-user' }, 'test_secret');
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should return 400 if user ID is missing in payload', async () => {
      const token = jwt.sign({}, 'test_secret');

      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid token payload');
    });

    it('should return 404 if user profile is not found', async () => {
      const mockGet = require('../../config/firestore').db.collection().doc().get;
      mockGet.mockResolvedValueOnce({ exists: false });

      const token = jwt.sign({ userId: 'test-user' }, 'test_secret');
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User profile not found');
    });

    it('should return 500 on internal server error', async () => {
      const mockGet = require('../../config/firestore').db.collection().doc().get;
      mockGet.mockRejectedValueOnce(new Error('DB Error'));

      const token = jwt.sign({ userId: 'test-user' }, 'test_secret');
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error validating token');
    });
  });

  describe('POST /api/auth/apple', () => {
    it('should return 400 if identityToken is missing', async () => {
      const response = await request(app).post('/api/auth/apple').send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('identityToken is required');
    });

    it('should handle apple sign-in for existing user', async () => {
      const appleSignin = require('apple-signin-auth');
      appleSignin.verifyIdToken.mockResolvedValueOnce({
        sub: 'apple-user-id',
        email: 'apple@example.com'
      });

      const mockGet = require('../../config/firestore').db.collection().where().get;
      mockGet.mockResolvedValueOnce({ 
        empty: false,
        docs: [{
          id: 'existing-id',
          data: () => ({ email: 'apple@example.com', name: 'Apple User' })
        }]
      });

      const response = await request(app).post('/api/auth/apple').send({
        identityToken: 'valid-token',
        fullName: { givenName: 'Apple', familyName: 'User' }
      });

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe('existing-id');
    });

    it('should handle apple sign-in for new user', async () => {
      const appleSignin = require('apple-signin-auth');
      appleSignin.verifyIdToken.mockResolvedValueOnce({
        sub: 'apple-new-id',
        email: 'applenew@example.com'
      });

      const mockGet = require('../../config/firestore').db.collection().where().get;
      const mockUpdate = require('../../config/firestore').db.collection().doc().update;
      
      // empty: true for appleId
      // empty: false for email
      mockGet.mockResolvedValueOnce({ empty: true }).mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'existing-email-id',
          data: () => ({ email: 'apple@example.com', name: 'Apple User' })
        }]
      });

      const response = await request(app).post('/api/auth/apple').send({
        identityToken: 'valid-token',
        fullName: { givenName: 'New', familyName: 'Apple' }
      });

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe('existing-email-id');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should handle apple sign-in for new user completely', async () => {
      const appleSignin = require('apple-signin-auth');
      appleSignin.verifyIdToken.mockResolvedValueOnce({
        sub: 'apple-new-id',
        email: 'applenew@example.com'
      });

      const mockGet = require('../../config/firestore').db.collection().where().get;
      const mockAdd = require('../../config/firestore').db.collection().add;
      
      // empty: true for both appleId and email
      mockGet.mockResolvedValueOnce({ empty: true }).mockResolvedValueOnce({ empty: true });
      mockAdd.mockResolvedValueOnce({ id: 'new-apple-id' });

      const response = await request(app).post('/api/auth/apple').send({
        identityToken: 'valid-token',
        fullName: { givenName: 'New', familyName: 'Apple' }
      });

      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe('new-apple-id');
    });

    it('should return 401 on invalid token', async () => {
      const appleSignin = require('apple-signin-auth');
      appleSignin.verifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

      const response = await request(app).post('/api/auth/apple').send({
        identityToken: 'invalid-token'
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid Apple identity token');
    });

    it('should return 500 on internal server error', async () => {
      const appleSignin = require('apple-signin-auth');
      appleSignin.verifyIdToken.mockResolvedValueOnce({ sub: 'test', email: 'test@example.com' });

      const mockGet = require('../../config/firestore').db.collection().where().get;
      mockGet.mockRejectedValueOnce(new Error('DB Error'));

      const response = await request(app).post('/api/auth/apple').send({
        identityToken: 'valid-token'
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error during Apple sign-in');
    });
  });

  describe('POST /api/auth/google', () => {
    it('should return 400 if idToken is missing', async () => {
      const response = await request(app).post('/api/auth/google').send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('idToken is required');
    });

    it('should return 401 if google token is invalid', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({ ok: false });
      const response = await request(app).post('/api/auth/google').send({ idToken: 'invalid' });
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid Google token');
    });

    it('should return 400 if google account has no email', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sub: 'no-email', name: 'Test' })
      });
      const response = await request(app).post('/api/auth/google').send({ idToken: 'valid' });
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Google account must have an email associated with it');
    });

    it('should handle google sign-in for existing googleId user', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sub: 'google-sub', email: 'google@example.com', name: 'Google User' })
      });

      const mockGet = require('../../config/firestore').db.collection().where().get;
      mockGet.mockResolvedValueOnce({ 
        empty: false,
        docs: [{
          id: 'existing-id',
          data: () => ({ email: 'google@example.com', name: 'Google User' })
        }]
      });

      const response = await request(app).post('/api/auth/google').send({ idToken: 'valid' });
      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe('existing-id');
    });

    it('should handle google sign-in for existing email user', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sub: 'google-sub', email: 'google@example.com' })
      });

      const mockGet = require('../../config/firestore').db.collection().where().get;
      const mockUpdate = require('../../config/firestore').db.collection().doc().update;

      mockGet.mockResolvedValueOnce({ empty: true }).mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'existing-email-id',
          data: () => ({ email: 'google@example.com', name: 'Google User' })
        }]
      });

      const response = await request(app).post('/api/auth/google').send({ idToken: 'valid' });
      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe('existing-email-id');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should handle google sign-in for completely new user', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sub: 'google-sub', email: 'newgoogle@example.com' })
      });

      const mockGet = require('../../config/firestore').db.collection().where().get;
      const mockAdd = require('../../config/firestore').db.collection().add;

      mockGet.mockResolvedValueOnce({ empty: true }).mockResolvedValueOnce({ empty: true });
      mockAdd.mockResolvedValueOnce({ id: 'new-google-id' });

      const response = await request(app).post('/api/auth/google').send({ idToken: 'valid' });
      expect(response.status).toBe(200);
      expect(response.body.user.id).toBe('new-google-id');
    });

    it('should return 500 on internal server error', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Fetch error'));
      const response = await request(app).post('/api/auth/google').send({ idToken: 'valid' });
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error during Google sign-in');
    });
  });
});
