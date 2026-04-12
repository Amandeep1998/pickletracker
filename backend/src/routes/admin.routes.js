const express = require('express');
const protect = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/admin.middleware');
const { getUsers } = require('../controllers/admin.controller');

const router = express.Router();

// All admin routes require a valid JWT AND admin email
router.use(protect, isAdmin);

router.get('/users', getUsers);

module.exports = router;
