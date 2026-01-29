exports.getHome = (req, res) => {
  res.render('pages/index', { title: 'helloRun - Virtual Running Events', user: req.user });
};

exports.getEvents = (req, res) => {
  res.render('pages/events', { 
    title: 'Events - helloRun',
    user: req.session.user || null
  });
};