'use strict';
// Renders layouts/nav.ejs the way Express does: with app.locals.buildNavigation available
// and a filename so the nav-item partial include resolves.
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { buildNavigation } = require('../../src/config/navigation');

const NAV_PATH = path.join(__dirname, '..', '..', 'src', 'views', 'layouts', 'nav.ejs');

function renderNav(locals = {}) {
  return ejs.render(
    fs.readFileSync(NAV_PATH, 'utf8'),
    { locals: { buildNavigation, flash: null, ...locals } },
    { filename: NAV_PATH }
  );
}

module.exports = { renderNav, NAV_PATH };

// Accepts the `{ locals: {...} }` shape older tests pass to ejs.render.
function renderNavFromOptions(options = {}) {
  return renderNav(options.locals || {});
}

module.exports.renderNavFromOptions = renderNavFromOptions;
