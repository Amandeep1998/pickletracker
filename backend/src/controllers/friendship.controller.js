const mongoose = require('mongoose');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Session = require('../models/Session');

function isObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function idsEqual(a, b) {
  return String(a) === String(b);
}

async function findAcceptedFriendship(userId, friendId) {
  return Friendship.findOne({
    status: 'accepted',
    $or: [
      { requesterId: userId, recipientId: friendId },
      { requesterId: friendId, recipientId: userId },
    ],
  }).lean();
}

const sendFriendRequest = async (req, res, next) => {
  try {
    const requesterId = req.user.id;
    const { recipientId } = req.body;

    if (!recipientId || !isObjectId(recipientId)) {
      return res.status(400).json({ success: false, message: 'Valid recipientId is required' });
    }
    if (idsEqual(requesterId, recipientId)) {
      return res.status(400).json({ success: false, message: 'You cannot send a request to yourself' });
    }

    const recipient = await User.findById(recipientId).select('_id').lean();
    if (!recipient) return res.status(404).json({ success: false, message: 'Player not found' });

    const existing = await Friendship.findOne({
      $or: [
        { requesterId, recipientId },
        { requesterId: recipientId, recipientId: requesterId },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(409).json({ success: false, message: 'You are already friends' });
      }
      if (existing.status === 'pending') {
        return res.status(409).json({ success: false, message: 'A friend request is already pending' });
      }
      existing.requesterId = requesterId;
      existing.recipientId = recipientId;
      existing.status = 'pending';
      await existing.save();
      return res.status(200).json({ success: true, data: existing });
    }

    const friendship = await Friendship.create({ requesterId, recipientId, status: 'pending' });
    return res.status(201).json({ success: true, data: friendship });
  } catch (err) {
    next(err);
  }
};

const listFriendRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const [incoming, outgoing] = await Promise.all([
      Friendship.find({ recipientId: userId, status: 'pending' })
        .populate('requesterId', 'name email profilePhoto city state')
        .sort({ createdAt: -1 })
        .lean(),
      Friendship.find({ requesterId: userId, status: 'pending' })
        .populate('recipientId', 'name email profilePhoto city state')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const normalize = (row, side) => ({
      id: row._id,
      side,
      createdAt: row.createdAt,
      user:
        side === 'incoming'
          ? {
              id: row.requesterId?._id,
              name: row.requesterId?.name,
              email: row.requesterId?.email,
              profilePhoto: row.requesterId?.profilePhoto || null,
              city: row.requesterId?.city || null,
              state: row.requesterId?.state || null,
            }
          : {
              id: row.recipientId?._id,
              name: row.recipientId?.name,
              email: row.recipientId?.email,
              profilePhoto: row.recipientId?.profilePhoto || null,
              city: row.recipientId?.city || null,
              state: row.recipientId?.state || null,
            },
    });

    res.json({
      success: true,
      data: {
        incoming: incoming.map((r) => normalize(r, 'incoming')),
        outgoing: outgoing.map((r) => normalize(r, 'outgoing')),
      },
    });
  } catch (err) {
    next(err);
  }
};

const acceptFriendRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const row = await Friendship.findOne({ _id: id, recipientId: userId, status: 'pending' });
    if (!row) return res.status(404).json({ success: false, message: 'Friend request not found' });
    row.status = 'accepted';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
};

const rejectFriendRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const row = await Friendship.findOne({ _id: id, recipientId: userId, status: 'pending' });
    if (!row) return res.status(404).json({ success: false, message: 'Friend request not found' });
    row.status = 'rejected';
    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    next(err);
  }
};

const listFriends = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const links = await Friendship.find({
      status: 'accepted',
      $or: [{ requesterId: userId }, { recipientId: userId }],
    })
      .populate('requesterId', 'name email profilePhoto city state')
      .populate('recipientId', 'name email profilePhoto city state')
      .sort({ updatedAt: -1 })
      .lean();

    const friends = links.map((row) => {
      const friend = idsEqual(row.requesterId._id, userId) ? row.recipientId : row.requesterId;
      return {
        friendshipId: row._id,
        id: friend._id,
        name: friend.name,
        email: friend.email,
        profilePhoto: friend.profilePhoto || null,
        city: friend.city || null,
        state: friend.state || null,
      };
    });

    res.json({ success: true, data: friends });
  } catch (err) {
    next(err);
  }
};

const getFriendSchedule = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;
    if (!isObjectId(friendId)) {
      return res.status(400).json({ success: false, message: 'Invalid friend id' });
    }

    const accepted = await findAcceptedFriendship(userId, friendId);
    if (!accepted) {
      return res.status(403).json({
        success: false,
        message: 'Friend schedule is visible only after the request is accepted.',
      });
    }

    const [sessions, tournaments] = await Promise.all([
      Session.find({ userId: friendId }).select('type date location.name').lean(),
      Tournament.find({ userId: friendId }).select('name categories').lean(),
    ]);

    const sessionEvents = sessions.map((s) => ({
      kind: 'session',
      date: s.date,
      title: s.type === 'practice' ? 'Practice session' : s.type === 'casual' ? 'Casual play' : 'Tournament prep',
      sessionType: s.type,
      locationName: s.location?.name || null,
    }));

    const tournamentEvents = tournaments.flatMap((t) =>
      (t.categories || []).map((c) => ({
        kind: 'tournament',
        date: c.date,
        title: t.name,
        categoryName: c.categoryName,
        medal: c.medal,
      }))
    );

    const events = [...sessionEvents, ...tournamentEvents]
      .filter((x) => x.date)
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendFriendRequest,
  listFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  listFriends,
  getFriendSchedule,
};
