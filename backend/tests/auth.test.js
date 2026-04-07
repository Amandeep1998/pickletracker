require('./setup');
const request = require('supertest');
const app = require('../server');

const validUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
};

describe('Auth - Signup', () => {
  it('should create a new user and return 201', async () => {
    const res = await request(app).post('/api/auth/signup').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/created/i);
  });

  it('should not expose password in response', async () => {
    const res = await request(app).post('/api/auth/signup').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.password).toBeUndefined();
  });

  it('should return 409 for duplicate email', async () => {
    await request(app).post('/api/auth/signup').send(validUser);
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validUser, username: 'otheruser' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/email/i);
  });

  it('should return 409 for duplicate username', async () => {
    await request(app).post('/api/auth/signup').send(validUser);
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validUser, email: 'other@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/username/i);
  });

  it('should return 400 when username is missing', async () => {
    const { username, ...noUsername } = validUser;
    const res = await request(app).post('/api/auth/signup').send(noUsername);
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('should return 400 when email is missing', async () => {
    const { email, ...noEmail } = validUser;
    const res = await request(app).post('/api/auth/signup').send(noEmail);
    expect(res.status).toBe(400);
  });

  it('should return 400 when password is missing', async () => {
    const { password, ...noPassword } = validUser;
    const res = await request(app).post('/api/auth/signup').send(noPassword);
    expect(res.status).toBe(400);
  });

  it('should return 400 when password is shorter than 6 characters', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validUser, password: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(/6 characters/i);
  });

  it('should return 400 when username is shorter than 3 characters', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validUser, username: 'ab' });
    expect(res.status).toBe(400);
  });

  it('should return 400 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...validUser, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

describe('Auth - Login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send(validUser);
  });

  it('should login successfully and return a token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.password).toBeUndefined();
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('should return 401 for unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'unknown@example.com', password: validUser.password });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('should return 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: validUser.password });
    expect(res.status).toBe(400);
  });

  it('should return 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: validUser.email });
    expect(res.status).toBe(400);
  });
});
