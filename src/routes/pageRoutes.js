const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('pages/home', {
    user: req.session?.user || null,
    isAuthenticated: !!req.session?.user
  });
});

router.get('/events', (req, res) => {
  res.render('pages/events', {
    user: req.session?.user || null,
    isAuthenticated: !!req.session?.user
  });
});

router.get('/blog', (req, res) => {
  res.render('pages/blog', {
    user: req.session?.user || null,
    isAuthenticated: !!req.session?.user
  });
});

router.get('/about', (req, res) => {
  res.render('pages/about', {
    user: req.session?.user || null,
    isAuthenticated: !!req.session?.user
  });
});

module.exports = router;