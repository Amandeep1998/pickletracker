require('./setup');
const request = require('supertest');
const app = require('../server');

const userA = { name: 'Player A', email: 'playerA@example.com', password: 'password123' };
const userB = { name: 'Player B', email: 'playerB@example.com', password: 'password123' };

const validTournament = {
  name: 'Regional Championship',
  categories: [
    {
      categoryName: "Women's Doubles",
      date: '2024-07-20',
      medal: 'Silver',
      prizeAmount: 3000,
      entryFee: 400,
    },
  ],
};

const getToken = async (user) => {
  await request(app).post('/api/auth/signup').send(user);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });
  return res.body.token;
};

describe('Authorization - Cross-user isolation', () => {
  let tokenA, tokenB, tournamentAId, tournamentBId;

  beforeEach(async () => {
    tokenA = await getToken(userA);
    tokenB = await getToken(userB);

    const resA = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ...validTournament, name: "User A's Tournament" });
    tournamentAId = resA.body.data._id;

    const resB = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ ...validTournament, name: "User B's Tournament" });
    tournamentBId = resB.body.data._id;
  });

  it("User A's GET should only return User A's tournaments", async () => {
    const res = await request(app)
      .get('/api/tournaments')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("User A's Tournament");
  });

  it("User B's GET should only return User B's tournaments", async () => {
    const res = await request(app)
      .get('/api/tournaments')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("User B's Tournament");
  });

  it("User B cannot update User A's tournament (returns 404)", async () => {
    const res = await request(app)
      .put(`/api/tournaments/${tournamentAId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ ...validTournament, name: 'Hijacked Tournament' });
    expect(res.status).toBe(404);
  });

  it("User B cannot delete User A's tournament (returns 404)", async () => {
    const res = await request(app)
      .delete(`/api/tournaments/${tournamentAId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);

    // Verify tournament A still exists for user A
    const listRes = await request(app)
      .get('/api/tournaments')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(listRes.body.data).toHaveLength(1);
  });

  it('User A can update their own tournament', async () => {
    const res = await request(app)
      .put(`/api/tournaments/${tournamentAId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ ...validTournament, name: 'Updated by A' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated by A');
  });

  it('User A can delete their own tournament', async () => {
    const res = await request(app)
      .delete(`/api/tournaments/${tournamentAId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
  });
});
