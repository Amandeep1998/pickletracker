const express = require('express');
const protect = require('../middleware/auth.middleware');
const {
  sendFriendRequest,
  listFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  listFriends,
  getFriendSchedule,
} = require('../controllers/friendship.controller');

const router = express.Router();

router.use(protect);

router.post('/requests', sendFriendRequest);
router.get('/requests', listFriendRequests);
router.post('/requests/:id/accept', acceptFriendRequest);
router.post('/requests/:id/reject', rejectFriendRequest);
router.get('/', listFriends);
router.get('/:friendId/schedule', getFriendSchedule);

module.exports = router;
