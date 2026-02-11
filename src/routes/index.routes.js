const express = require('express');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
  res.render('pages/index', {
    title: 'Home - helloRun'
  });
});

// Events page
router.get('/events', (req, res) => {
  res.render('pages/events', {
    title: 'Events - helloRun'
  });
});

// About page
router.get('/about', (req, res) => {
  res.render('pages/about', {
    title: 'About - helloRun'
  });
});

module.exports = router;