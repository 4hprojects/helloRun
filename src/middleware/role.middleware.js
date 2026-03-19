exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.redirect('/login');
    }

    if (!allowedRoles.includes(req.session.role)) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to access this page',
        user: null
      });
    }

    next();
  };
};