const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { getStudents, upsertStudents, deleteStudent } = require('../controllers/coachStudent.controller');

router.get('/', protect, getStudents);
router.post('/upsert', protect, upsertStudents);
router.delete('/:id', protect, deleteStudent);

module.exports = router;
