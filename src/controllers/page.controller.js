exports.getHome = (req, res) => {
  res.render('pages/home', { 
    title: 'Home - helloRun',
    user: req.session.user || null
  });
};

exports.getEvents = (req, res) => {
  res.render('pages/events', { 
    title: 'Events - helloRun',
    user: req.session.user || null
  });
};