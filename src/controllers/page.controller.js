exports.getHome = (req, res) => {
  res.render('pages/index', { title: 'helloRun - Virtual Running Events', user: req.user });
};

exports.getEvents = (req, res) => {
  // Check for login success message
  const loginSuccess = req.session.loginSuccess || false;
  const userName = req.session.userName || null;
  
  // Clear the flash message after reading
  delete req.session.loginSuccess;
  delete req.session.userName;
  
  res.render('pages/events', { // ✅ Fixed: Added 'pages/' prefix
    title: 'Running Events - HelloRun',
    loginSuccess,
    userName
  });
};