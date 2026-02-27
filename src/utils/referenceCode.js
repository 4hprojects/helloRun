function buildReferencePrefix(title) {
  const normalized = String(title || '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .trim();

  if (!normalized) return 'EVT';

  const words = normalized.split(/\s+/).filter(Boolean);
  const condensed = words.join('');
  if (!condensed) return 'EVT';

  let prefix = '';
  if (words.length >= 3) {
    prefix = words.slice(0, 3).map((word) => word[0]).join('');
  } else {
    prefix = condensed.slice(0, 3);
  }

  return prefix.padEnd(3, 'X').slice(0, 3);
}

function formatYYDDMM(inputDate) {
  const date = inputDate instanceof Date ? inputDate : new Date(inputDate);
  const year = String(date.getUTCFullYear()).slice(-2);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}${day}${month}`;
}

function buildReferenceCodeBase(title, date) {
  const prefix = buildReferencePrefix(title);
  const datePart = formatYYDDMM(date);
  return `${prefix}-${datePart}`;
}

async function generateUniqueReferenceCode({ title, date, existsFn }) {
  const base = buildReferenceCodeBase(title, date || new Date());
  let candidate = base;
  let suffix = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await existsFn(candidate);
    if (!exists) return candidate;
    candidate = `${base}-${String(suffix).padStart(2, '0')}`;
    suffix += 1;
  }
}

module.exports = {
  buildReferenceCodeBase,
  generateUniqueReferenceCode
};
