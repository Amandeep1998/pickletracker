const express = require('express');
const router = express.Router();
const multer = require('multer');
const protect = require('../middleware/auth.middleware');
const { parseFromFile } = require('../controllers/document.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and image files (JPG, PNG, WebP) are supported'));
  },
});

router.use(protect);

router.post('/parse-file', upload.single('file'), parseFromFile);

module.exports = router;
