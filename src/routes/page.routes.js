const express = require('express');
const router = express.Router();
const pageController = require('../controllers/page.controller');

router.get('/', pageController.getHome);
router.get('/events', pageController.getEvents); // ✅ Should use controller

module.exports = router;