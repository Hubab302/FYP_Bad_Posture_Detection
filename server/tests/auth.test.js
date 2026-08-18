/**
 * Auth API Tests — Signup, Login, Logout, Protected Routes
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const session = require('express-session');
const authRoutes = require('../routes/auth');
const User = require('../models/User');
const { errorHandler } = require('../middleware/errorHandler');

let app;

beforeAll(async () => {
  const uri = 'mongodb://127.0.0.1:27017/posture_coach_test';
  await mongoose.connect(uri);

  app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
  );
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
});

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe('POST /api/auth/signup', () => {
  test('should create a new user with valid data', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ username: 'testuser', email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe('testuser');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('should reject duplicate email', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ username: 'user1', email: 'dup@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ username: 'user2', email: 'dup@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('email');
  });

  test('should reject duplicate username', async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ username: 'sameuser', email: 'a@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ username: 'sameuser', email: 'b@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('username');
  });

  test('should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ username: 'user', email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
  });

  test('should reject weak password', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ username: 'user', email: 'test@example.com', password: '12' });

    expect(res.status).toBe(400);
  });

  test('should reject missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ username: 'user' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/signup')
      .send({ username: 'loginuser', email: 'login@example.com', password: 'password123' });
  });

  test('should login with correct email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'login@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('loginuser');
  });

  test('should login with correct username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'loginuser', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('loginuser');
  });

  test('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'login@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials.');
  });

  test('should reject non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials.');
  });

  test('should reject missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  test('should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
