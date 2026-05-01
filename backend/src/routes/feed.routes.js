const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const {
  getFeed,
  getNotifications,
  markAllRead,
  toggleLike,
  getComments,
  addComment,
  deleteComment,
} = require('../controllers/feed.controller');

// Notification routes — must be defined before /:tournamentId to avoid conflicts
router.get('/notifications',          protect, getNotifications);
router.put('/notifications/read-all', protect, markAllRead);

// Feed
router.get('/', protect, getFeed);

// Likes & comments
router.post('/:tournamentId/like',                   protect, toggleLike);
router.get('/:tournamentId/comments',                protect, getComments);
router.post('/:tournamentId/comments',               protect, addComment);
router.delete('/:tournamentId/comments/:commentId',  protect, deleteComment);

module.exports = router;
