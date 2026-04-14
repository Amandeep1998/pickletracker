const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { exportData } = require('../controllers/export.controller');

router.get('/', protect, exportData);

module.exports = router;
