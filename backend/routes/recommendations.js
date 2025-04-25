const express = require('express');
const router = express.Router();

const { getWatchedMedia } = require('../controllers/recommendationsController');

router.get('/users/watched', auth, getWatchedMedia);

module.exports = router; 