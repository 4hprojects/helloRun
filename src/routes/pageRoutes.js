const express = require('express');
const router = express.Router();
const pageController = require('../controllers/page.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/', (req, res) => {
  res.render('pages/home', {
    title: 'helloRun - Virtual Running Events'
  });
});

router.get('/events', pageController.getEvents);
router.get('/my-registrations', requireAuth, pageController.getMyRegistrations);
router.get('/events/:slug/register', requireAuth, pageController.getEventRegistrationForm);
router.post('/events/:slug/register', requireAuth, pageController.postEventRegistration);
router.get('/events/:slug', pageController.getEventDetails);

router.get('/blog', (req, res) => {
  res.render('pages/blog', {
    title: 'Blog - helloRun'
  });
});

router.get('/about', (req, res) => {
  res.render('pages/about', {
    title: 'About - helloRun'
  });
});

router.get('/leaderboard', (req, res) => {
  res.render('pages/leaderboard', { title: 'Leaderboard - helloRun' });
});

module.exports = router;
