require('./setup');
const request = require('supertest');
const app = require('../server');

const userA = { name: 'Friend A', email: 'friend-a@example.com', password: 'password123' };
const userB = { name: 'Friend B', email: 'friend-b@example.com', password: 'password123' };

const getToken = async (user) => {
  await request(app).post('/api/auth/signup').send(user);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });
  return { token: res.body.token, user: res.body.user };
};

describe('Friendship + schedule visibility', () => {
  let tokenA;
  let tokenB;
  let userAId;
  let userBId;

  beforeEach(async () => {
    const a = await getToken(userA);
    const b = await getToken(userB);
    tokenA = a.token;
    tokenB = b.token;
    userAId = a.user.id;
    userBId = b.user.id;
  });

  it('creates request and shares schedule only after acceptance', async () => {
    await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        name: 'City Challenge',
        categories: [
          {
            categoryName: "Men's Singles Open",
            date: '2026-04-19',
            medal: 'Gold',
            prizeAmount: 2500,
            entryFee: 500,
          },
        ],
      });
    await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        type: 'practice',
        date: '2026-04-20',
        location: { name: 'Court 7' },
        rating: 4,
        wentWell: ['Dinking'],
        wentWrong: ['Returns'],
        notes: '',
        courtFee: 250,
      });

    const reqRes = await request(app)
      .post('/api/friends/requests')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipientId: userBId });
    expect(reqRes.status).toBe(201);

    const blockedRes = await request(app)
      .get(`/api/friends/${userBId}/schedule`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(blockedRes.status).toBe(403);

    const listIncoming = await request(app)
      .get('/api/friends/requests')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(listIncoming.status).toBe(200);
    expect(listIncoming.body.data.incoming).toHaveLength(1);

    const acceptId = listIncoming.body.data.incoming[0].id;
    const acceptRes = await request(app)
      .post(`/api/friends/requests/${acceptId}/accept`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(acceptRes.status).toBe(200);

    const allowedRes = await request(app)
      .get(`/api/friends/${userBId}/schedule`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(allowedRes.status).toBe(200);
    expect(Array.isArray(allowedRes.body.data)).toBe(true);
    const tournamentEvent = allowedRes.body.data.find((e) => e.kind === 'tournament');
    expect(tournamentEvent).toBeTruthy();
    expect(tournamentEvent.entryFee).toBeUndefined();
    expect(tournamentEvent.prizeAmount).toBeUndefined();
  });

  it('includes split dupr and manual achievements in player detail', async () => {
    const updateRes = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        duprSingles: 3.5,
        duprDoubles: 4.1,
        manualAchievements: [
          {
            tournamentName: 'Legacy Open',
            categoryName: 'Mixed Doubles',
            medal: 'Silver',
            date: '2025-01-04',
          },
        ],
      });
    expect(updateRes.status).toBe(200);

    const detailRes = await request(app)
      .get(`/api/players/${userAId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.duprSingles).toBe(3.5);
    expect(detailRes.body.data.duprDoubles).toBe(4.1);
    expect(detailRes.body.data.manualAchievements).toHaveLength(1);
    expect(detailRes.body.data.tournamentNames).toContain('Legacy Open');
  });
});
