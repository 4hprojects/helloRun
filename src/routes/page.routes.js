const express = require('express');
const router = express.Router();

// Home page
router.get('/', (req, res) => {
  res.render('pages/index', {
    title: 'helloRun - Virtual Running Events',
    user: req.session.user || null
  });
});

// About page
router.get('/about', (req, res) => {
  res.render('pages/about', {
    title: 'About Us - helloRun',
    user: req.session.user || null
  });
});

// Blog page
router.get('/blog', (req, res) => {
  res.render('pages/blog', {
    title: 'Blog - helloRun',
    user: req.session.user || null
  });
});

// Events page
router.get('/events', (req, res) => {
  res.render('pages/events', {
    title: 'Browse Events - helloRun',
    user: req.session.user || null
  });
});

// How It Works page
router.get('/how-it-works', (req, res) => {
  res.render('pages/how-it-works', {
    title: 'How It Works - helloRun',
    user: req.session.user || null
  });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('pages/contact', {
    title: 'Contact Us - helloRun',
    user: req.session.user || null
  });
});

module.exports = router;