const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const {
  getProgress,
  getAchievements,
  getGamificationFeed,
  toggleGamificationReaction,
  markAchievementShared,
  triggerCheck,
} = require('../controllers/gamification.controller');

router.get('/progress', protect, getProgress);
router.get('/achievements', protect, getAchievements);
router.get('/feed', protect, getGamificationFeed);
router.post('/feed/:itemId/react', protect, toggleGamificationReaction);
router.post('/achievements/:achievementId/share', protect, markAchievementShared);
router.post('/check', protect, triggerCheck);

module.exports = router;
