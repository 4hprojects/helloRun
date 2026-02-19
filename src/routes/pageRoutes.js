const express = require('express');
const router = express.Router();
const pageController = require('../controllers/page.controller');

router.get('/', (req, res) => {
  res.render('pages/home', {
    title: 'helloRun - Virtual Running Events'
  });
});

router.get('/events', pageController.getEvents);

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