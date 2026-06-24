const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readSource(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

test('high-impact runner and organizer workflows emit critical audit events', () => {
  const pageController = readSource('src/controllers/page.controller.js');
  const shopController = readSource('src/controllers/shop.controller.js');
  const organizerRoutes = readSource('src/routes/organizer.routes.js');
  const organizerShopController = readSource('src/controllers/organizer-shop.controller.js');

  assert.match(pageController, /payment\.receipt_submitted/);
  assert.match(shopController, /shop\.payment_receipt_submitted/);
  assert.match(organizerRoutes, /organiser\.registrants_exported/);
  assert.match(organizerRoutes, /organiser\.payment_reminder_sent/);
  assert.match(organizerShopController, /organiser\.shop_orders_exported/);
});
