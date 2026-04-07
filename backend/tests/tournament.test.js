require('./setup');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');

const userPayload = { username: 'player1', email: 'player1@example.com', password: 'password123' };

const validTournament = {
  name: 'City Open 2024',
  categories: [
    {
      categoryName: "Men's Singles",
      medal: 'Gold',
      prizeAmount: 5000,
      entryFee: 500,
    },
  ],
  date: '2024-06-15',
};

let token;

const signup = () => request(app).post('/api/auth/signup').send(userPayload);
const login = () =>
  request(app)
    .post('/api/auth/login')
    .send({ email: userPayload.email, password: userPayload.password });

beforeEach(async () => {
  await signup();
  const res = await login();
  token = res.body.token;
});

describe('Tournament - Auth Guards', () => {
  it('should return 401 when no token provided', async () => {
    const res = await request(app).get('/api/tournaments');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no token/i);
  });

  it('should return 401 for invalid token', async () => {
    const res = await request(app)
      .get('/api/tournaments')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid token/i);
  });

  it('should return 401 for expired token', async () => {
    const expiredToken = jwt.sign(
      { id: 'someId', username: 'test', email: 'test@test.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '-1s' }
    );
    const res = await request(app)
      .get('/api/tournaments')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });
});

describe('Tournament - GET /api/tournaments', () => {
  it('should return empty array when no tournaments exist', async () => {
    const res = await request(app)
      .get('/api/tournaments')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('should return user tournaments', async () => {
    await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send(validTournament);

    const res = await request(app)
      .get('/api/tournaments')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe(validTournament.name);
  });
});

describe('Tournament - POST /api/tournaments', () => {
  it('should create a tournament and return computed profit', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send(validTournament);
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe(validTournament.name);
    // totalProfit = 5000 - 500 = 4500
    expect(res.body.data.totalProfit).toBe(4500);
  });

  it('should return 400 when medal is None but prizeAmount > 0', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validTournament,
        categories: [{ ...validTournament.categories[0], medal: 'None', prizeAmount: 100 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(/winning amount must be 0/i);
  });

  it('should return 400 when medal is Gold but prizeAmount is 0', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validTournament,
        categories: [{ ...validTournament.categories[0], medal: 'Gold', prizeAmount: 0 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toMatch(/greater than 0/i);
  });

  it('should allow medal None with prizeAmount 0', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validTournament,
        categories: [{ ...validTournament.categories[0], medal: 'None', prizeAmount: 0 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.categories[0].medal).toBe('None');
    expect(res.body.data.categories[0].prizeAmount).toBe(0);
  });

  it('should return 400 for negative entryFee in category', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validTournament,
        categories: [{ ...validTournament.categories[0], entryFee: -100 }],
      });
    expect(res.status).toBe(400);
  });


  it('should return 400 for invalid category name', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validTournament,
        categories: [{ ...validTournament.categories[0], categoryName: 'Invalid Category' }],
      });
    expect(res.status).toBe(400);
  });

  it('should return 400 when name is missing', async () => {
    const { name, ...noName } = validTournament;
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send(noName);
    expect(res.status).toBe(400);
  });

  it('should return 400 when date is missing', async () => {
    const { date, ...noDate } = validTournament;
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send(noDate);
    expect(res.status).toBe(400);
  });

  it('should handle large monetary values correctly', async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validTournament,
        categories: [
          {
            categoryName: "Men's Singles",
            medal: 'Gold',
            prizeAmount: 999999.99,
            entryFee: 1000.50,
          },
        ],
      });
    expect(res.status).toBe(201);
    // totalProfit = 999999.99 - 1000.50 = 998999.49
    expect(res.body.data.totalProfit).toBeCloseTo(998999.49, 2);
  });
});

describe('Tournament - PUT /api/tournaments/:id', () => {
  let tournamentId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send(validTournament);
    tournamentId = res.body.data._id;
  });

  it('should update a tournament successfully', async () => {
    const res = await request(app)
      .put(`/api/tournaments/${tournamentId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...validTournament,
        name: 'Updated Tournament',
        categories: [{ ...validTournament.categories[0], prizeAmount: 8000 }],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Tournament');
    // totalProfit = 8000 - 500 = 7500
    expect(res.body.data.totalProfit).toBe(7500);
  });

  it('should return 400 for invalid ObjectId', async () => {
    const res = await request(app)
      .put('/api/tournaments/not-a-valid-id')
      .set('Authorization', `Bearer ${token}`)
      .send(validTournament);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid id/i);
  });

  it('should return 404 for non-existent tournament ID', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .put(`/api/tournaments/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(validTournament);
    expect(res.status).toBe(404);
  });
});

describe('Tournament - DELETE /api/tournaments/:id', () => {
  let tournamentId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${token}`)
      .send(validTournament);
    tournamentId = res.body.data._id;
  });

  it('should delete a tournament successfully', async () => {
    const res = await request(app)
      .delete(`/api/tournaments/${tournamentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);

    // Verify it's gone
    const listRes = await request(app)
      .get('/api/tournaments')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.data).toHaveLength(0);
  });

  it('should return 404 for non-existent tournament ID', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .delete(`/api/tournaments/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
