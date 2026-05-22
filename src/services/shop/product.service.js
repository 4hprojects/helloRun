const { getPostgresClient } = require('../../db/postgres');

async function listProducts(options = {}) {
  const sql = getPostgresClient();
  const eventId = String(options.eventId || '').trim();
  const limit = normalizeLimit(options.limit, 50);

  if (!eventId) return [];

  const rows = await sql`
    select id, event_id, organiser_id, name, slug, product_type, base_price, currency, status,
           is_visible, show_during_registration, show_in_event_shop, created_at, updated_at
    from products_core
    where event_id::text = ${eventId}
    order by created_at desc
    limit ${limit}
  `;

  return rows;
}

async function listProductsByMongoEventId(mongoEventId, options = {}) {
  const sql = getPostgresClient();
  const safeMongoEventId = String(mongoEventId || '').trim();
  const limit = normalizeLimit(options.limit, 50);
  const publicOnly = options.publicOnly === true;
  if (!safeMongoEventId) return [];

  const rows = publicOnly
    ? await sql`
      select p.id, p.event_id, p.organiser_id, p.name, p.slug, p.product_type, p.base_price, p.currency,
             p.status, p.is_visible, p.show_during_registration, p.show_in_event_shop, p.created_at, p.updated_at
      from products_core p
      join events_core ec on ec.id = p.event_id
      where ec.mongo_event_id = ${safeMongoEventId}
        and p.status = 'active'
        and p.is_visible = true
        and p.show_in_event_shop = true
      order by p.created_at desc
      limit ${limit}
    `
    : await sql`
    select p.id, p.event_id, p.organiser_id, p.name, p.slug, p.product_type, p.base_price, p.currency,
           p.status, p.is_visible, p.show_during_registration, p.show_in_event_shop, p.created_at, p.updated_at
    from products_core p
    join events_core ec on ec.id = p.event_id
    where ec.mongo_event_id = ${safeMongoEventId}
    order by p.created_at desc
    limit ${limit}
  `;

  return rows;
}

async function getPublicProductByEventSlugAndProductSlug(eventSlug, productSlug) {
  const sql = getPostgresClient();
  const safeEventSlug = String(eventSlug || '').trim();
  const safeProductSlug = String(productSlug || '').trim();
  if (!safeEventSlug || !safeProductSlug) return null;

  const rows = await sql`
    select p.id, p.event_id, p.organiser_id, p.name, p.slug, p.category, p.product_type,
           p.base_price, p.currency, p.status, p.is_visible, p.show_during_registration,
           p.show_in_event_shop, p.allow_pickup, p.allow_delivery, p.delivery_fee,
           p.available_from, p.available_until, p.created_at, p.updated_at,
           ec.mongo_event_id, ec.slug as event_slug, ec.title as event_title
    from products_core p
    join events_core ec on ec.id = p.event_id
    where ec.slug = ${safeEventSlug}
      and p.slug = ${safeProductSlug}
      and p.status = 'active'
      and p.is_visible = true
      and p.show_in_event_shop = true
    limit 1
  `;

  return rows[0] || null;
}

async function getProductById(productId) {
  const sql = getPostgresClient();
  const id = String(productId || '').trim();
  if (!id) return null;

  const rows = await sql`
    select * from products_core
    where id::text = ${id}
    limit 1
  `;
  return rows[0] || null;
}

async function createProductForMongoEvent(mongoEventId, payload = {}, actorAppUserId = null) {
  const sql = getPostgresClient();
  const safeMongoEventId = String(mongoEventId || '').trim();
  if (!safeMongoEventId) return null;

  const eventRows = await sql`
    select id
    from events_core
    where mongo_event_id = ${safeMongoEventId}
    limit 1
  `;
  const eventCore = eventRows[0] || null;
  if (!eventCore) return null;

  const name = String(payload.name || '').trim();
  const slug = await createUniqueSlug(payload.slug || name);
  const basePrice = asMoney(payload.basePrice ?? payload.base_price ?? 0);
  const currency = normalizeCurrency(payload.currency);
  const status = normalizeProductStatus(payload.status);
  const isVisible = toBoolean(payload.isVisible ?? payload.is_visible, status === 'active');
  const showDuringRegistration = toBoolean(payload.showDuringRegistration ?? payload.show_during_registration, false);
  const showInEventShop = toBoolean(payload.showInEventShop ?? payload.show_in_event_shop, isVisible);
  const allowPickup = toBoolean(payload.allowPickup ?? payload.allow_pickup, true);
  const allowDelivery = toBoolean(payload.allowDelivery ?? payload.allow_delivery, false);
  const deliveryFee = asMoney(payload.deliveryFee ?? payload.delivery_fee ?? 0);
  const productType = normalizeProductType(payload.productType ?? payload.product_type);
  const category = nullableText(payload.category);
  const actorId = actorAppUserId ? String(actorAppUserId) : null;

  const rows = await sql`
    insert into products_core (
      event_id, organiser_id, name, slug, category, base_price, currency, status,
      owner_type, product_type, is_visible, show_during_registration, show_in_event_shop,
      requires_admin_approval, allow_pickup, allow_delivery, delivery_fee,
      created_by, updated_by
    )
    values (
      ${eventCore.id}, null, ${name}, ${slug}, ${category}, ${basePrice}, ${currency}, ${status},
      'organiser', ${productType}, ${isVisible}, ${showDuringRegistration}, ${showInEventShop},
      true, ${allowPickup}, ${allowDelivery}, ${deliveryFee}, ${actorId}, ${actorId}
    )
    returning *
  `;

  return rows[0] || null;
}

async function updateProduct(productId, payload = {}, actorAppUserId = null) {
  const existing = await getProductById(productId);
  if (!existing) return null;

  const sql = getPostgresClient();
  const name = String(payload.name ?? existing.name ?? '').trim();
  const requestedSlug = String(payload.slug || '').trim();
  const slug = requestedSlug && requestedSlug !== existing.slug
    ? await createUniqueSlug(requestedSlug, existing.id)
    : existing.slug;
  const basePrice = asMoney(payload.basePrice ?? payload.base_price ?? existing.base_price ?? 0);
  const currency = normalizeCurrency(payload.currency ?? existing.currency);
  const status = normalizeProductStatus(payload.status ?? existing.status);
  const isVisible = toBoolean(payload.isVisible ?? payload.is_visible, existing.is_visible);
  const showDuringRegistration = toBoolean(payload.showDuringRegistration ?? payload.show_during_registration, existing.show_during_registration);
  const showInEventShop = toBoolean(payload.showInEventShop ?? payload.show_in_event_shop, existing.show_in_event_shop);
  const allowPickup = toBoolean(payload.allowPickup ?? payload.allow_pickup, existing.allow_pickup);
  const allowDelivery = toBoolean(payload.allowDelivery ?? payload.allow_delivery, existing.allow_delivery);
  const deliveryFee = asMoney(payload.deliveryFee ?? payload.delivery_fee ?? existing.delivery_fee ?? 0);
  const productType = normalizeProductType(payload.productType ?? payload.product_type ?? existing.product_type);
  const category = nullableText(payload.category ?? existing.category);
  const actorId = actorAppUserId ? String(actorAppUserId) : null;

  const rows = await sql`
    update products_core
    set name = ${name},
        slug = ${slug},
        category = ${category},
        base_price = ${basePrice},
        currency = ${currency},
        status = ${status},
        product_type = ${productType},
        is_visible = ${isVisible},
        show_during_registration = ${showDuringRegistration},
        show_in_event_shop = ${showInEventShop},
        allow_pickup = ${allowPickup},
        allow_delivery = ${allowDelivery},
        delivery_fee = ${deliveryFee},
        updated_by = ${actorId},
        updated_at = now()
    where id::text = ${String(productId)}
    returning *
  `;

  return rows[0] || null;
}

async function hideProduct(productId, actorAppUserId = null) {
  const rows = await getPostgresClient()`
    update products_core
    set is_visible = false,
        show_in_event_shop = false,
        show_during_registration = false,
        updated_by = ${actorAppUserId ? String(actorAppUserId) : null},
        updated_at = now()
    where id::text = ${String(productId || '').trim()}
    returning *
  `;
  return rows[0] || null;
}

async function archiveProduct(productId, actorAppUserId = null) {
  const rows = await getPostgresClient()`
    update products_core
    set status = 'archived',
        is_visible = false,
        show_in_event_shop = false,
        show_during_registration = false,
        updated_by = ${actorAppUserId ? String(actorAppUserId) : null},
        updated_at = now()
    where id::text = ${String(productId || '').trim()}
    returning *
  `;
  return rows[0] || null;
}

async function listProductsForAdmin(options = {}) {
  const limit = normalizeLimit(options.limit, 50);
  return getPostgresClient()`
    select p.id, p.event_id, p.name, p.slug, p.product_type, p.base_price, p.currency,
           p.status, p.is_visible, p.show_in_event_shop, p.requires_admin_approval,
           p.created_at, p.updated_at, ec.slug as event_slug, ec.title as event_title
    from products_core p
    left join events_core ec on ec.id = p.event_id
    order by p.created_at desc
    limit ${limit}
  `;
}

async function listPendingProductApprovals(options = {}) {
  const limit = normalizeLimit(options.limit, 50);
  return getPostgresClient()`
    select p.id, p.event_id, p.name, p.slug, p.product_type, p.base_price, p.currency,
           p.status, p.is_visible, p.show_in_event_shop, p.requires_admin_approval,
           p.created_at, p.updated_at, ec.slug as event_slug, ec.title as event_title
    from products_core p
    left join events_core ec on ec.id = p.event_id
    where p.requires_admin_approval = true
      and p.status <> 'archived'
    order by p.created_at asc
    limit ${limit}
  `;
}

async function updateProductApproval(productId, decision, actorAppUserId = null) {
  const normalizedDecision = String(decision || '').trim();
  const actorId = actorAppUserId ? String(actorAppUserId) : null;
  const approved = normalizedDecision === 'approved';
  const rejected = normalizedDecision === 'rejected';
  if (!approved && !rejected) return null;

  const rows = await getPostgresClient()`
    update products_core
    set requires_admin_approval = false,
        status = ${approved ? 'active' : 'archived'},
        is_visible = ${approved},
        show_in_event_shop = ${approved},
        updated_by = ${actorId},
        updated_at = now()
    where id::text = ${String(productId || '').trim()}
    returning *
  `;
  return rows[0] || null;
}

async function createUniqueSlug(rawValue, existingProductId = null) {
  const sql = getPostgresClient();
  const base = slugify(rawValue || 'product');
  let candidate = base;
  let suffix = 2;

  while (true) {
    const rows = existingProductId
      ? await sql`
        select id
        from products_core
        where slug = ${candidate}
          and id::text <> ${String(existingProductId)}
        limit 1
      `
      : await sql`
        select id
        from products_core
        where slug = ${candidate}
        limit 1
      `;
    if (!rows.length) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

function slugify(value) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return slug || `product-${Date.now()}`;
}

function normalizeProductStatus(value) {
  const status = String(value || 'draft').trim();
  return ['draft', 'active', 'archived'].includes(status) ? status : 'draft';
}

function normalizeProductType(value) {
  const productType = String(value || 'event_shop_item').trim();
  return ['registration_addon', 'event_shop_item', 'digital_item', 'delivery_fee', 'donation', 'sponsor_item'].includes(productType)
    ? productType
    : 'event_shop_item';
}

function normalizeCurrency(value) {
  return String(value || 'PHP').trim().toUpperCase().slice(0, 8) || 'PHP';
}

function nullableText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function asMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.round(numeric * 100) / 100);
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return Boolean(fallback);
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function normalizeLimit(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}

module.exports = {
  listProducts,
  listProductsByMongoEventId,
  getPublicProductByEventSlugAndProductSlug,
  getProductById,
  createProductForMongoEvent,
  updateProduct,
  hideProduct,
  archiveProduct,
  listProductsForAdmin,
  listPendingProductApprovals,
  updateProductApproval
};
