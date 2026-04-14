const express = require('express');
const protect = require('../middleware/auth.middleware');
const {
  sendFriendRequest,
  listFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelOutgoingFriendRequest,
  listFriends,
  getFriendSchedule,
  removeFriend,
} = require('../controllers/friendship.controller');

const router = express.Router();

router.use(protect);

router.post('/requests', sendFriendRequest);
router.get('/requests', listFriendRequests);
router.post('/requests/:id/accept', acceptFriendRequest);
router.post('/requests/:id/reject', rejectFriendRequest);
router.delete('/requests/:id', cancelOutgoingFriendRequest);
router.get('/', listFriends);
router.get('/:friendId/schedule', getFriendSchedule);
router.delete('/:friendId', removeFriend);

module.exports = router;
