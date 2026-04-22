const express = require('express');
const protect = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/admin.middleware');
const {
  getUsers,
  getUserTournaments,
  toggleWhatsAppAccess,
  deleteUser,
  broadcastEmail,
  getAdminStories,
  createAdminStory,
  updateAdminStory,
} = require('../controllers/admin.controller');

const router = express.Router();

// All admin routes require a valid JWT AND admin email
router.use(protect, isAdmin);

router.get('/users', getUsers);
router.get('/users/:id/tournaments', getUserTournaments);
router.put('/users/:id/whatsapp-access', toggleWhatsAppAccess);
router.delete('/users/:id', deleteUser);
router.post('/broadcast-email', broadcastEmail);
router.get('/stories', getAdminStories);
router.post('/stories', createAdminStory);
router.put('/stories/:id', updateAdminStory);

module.exports = router;
