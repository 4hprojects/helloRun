require('dotenv').config();

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  S3Client,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand
} = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_MANIFEST = path.join(PROJECT_ROOT, 'assets/events/active-quest/release-manifest.json');
const EXPECTED_PATHS = new Set([
  'assets/events/active-quest/active-quest-logo.webp',
  'assets/events/active-quest/active-quest-banner.webp',
  'assets/events/active-quest/active-quest-poster.webp',
  'assets/events/active-quest/active-quest-certificate-background.webp',
  'assets/events/november-active-quest-2026/25k-starter-quest.webp',
  'assets/events/november-active-quest-2026/50k-active-quest.webp',
  'assets/events/november-active-quest-2026/75k-momentum-quest.webp',
  'assets/events/november-active-quest-2026/100k-endurance-quest.webp',
  'assets/events/november-active-quest-2026/150k-distance-quest.webp',
  'assets/events/november-active-quest-2026/200k-ultra-quest.webp'
]);
const REQUIRED_R2_ENV = [
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT',
  'R2_PUBLIC_BASE_URL'
];

function argumentValue(argv, name) {
  const prefix = `--${name}=`;
  return argv.find((value) => value.startsWith(prefix))?.slice(prefix.length).trim() || '';
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function writePrivateJson(filePath, value, { exclusive = false } = {}) {
  if (!path.isAbsolute(filePath)) throw new Error('Rollback manifest path must be absolute.');
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
    flag: exclusive ? 'wx' : 'w'
  });
  fs.chmodSync(filePath, 0o600);
}

function loadManifest(manifestPath = DEFAULT_MANIFEST) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.version !== 1 || !manifest.releaseId || !Array.isArray(manifest.assets)) {
    throw new Error('Malformed asset manifest.');
  }
  const paths = manifest.assets.map((asset) => asset.path);
  const keys = manifest.assets.map((asset) => asset.r2Key);
  const ids = manifest.assets.map((asset) => asset.id);
  for (const [label, values] of [['path', paths], ['R2 key', keys], ['id', ids]]) {
    if (new Set(values).size !== values.length) throw new Error(`Duplicate asset ${label}.`);
  }
  if (paths.length !== EXPECTED_PATHS.size || paths.some((value) => !EXPECTED_PATHS.has(value))) {
    throw new Error('Asset manifest has missing or unexpected files.');
  }
  for (const asset of manifest.assets) {
    if (!asset.id || asset.mimeType !== 'image/webp' || !Number.isInteger(asset.width) || !Number.isInteger(asset.height)) {
      throw new Error(`Malformed asset entry: ${asset.id || '(unknown)'}.`);
    }
    if (!/^active-quest\/(series|editions\/2026-11\/rewards)\/[a-z0-9-]+\.webp$/.test(asset.r2Key)) {
      throw new Error(`Unexpected R2 key: ${asset.r2Key}.`);
    }
    if (!/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error(`Malformed checksum: ${asset.id}.`);
    const absolutePath = path.resolve(PROJECT_ROOT, asset.path);
    if (!absolutePath.startsWith(`${PROJECT_ROOT}${path.sep}`)) throw new Error(`Unsafe asset path: ${asset.path}.`);
  }
  return manifest;
}

async function validateAssets(manifest) {
  const found = [];
  for (const directory of ['assets/events/active-quest', 'assets/events/november-active-quest-2026']) {
    for (const name of fs.readdirSync(path.join(PROJECT_ROOT, directory))) {
      if (name === 'release-manifest.json') continue;
      found.push(`${directory}/${name}`);
    }
  }
  if (found.length !== EXPECTED_PATHS.size || found.some((value) => !EXPECTED_PATHS.has(value))) {
    throw new Error('Asset directories contain missing or unexpected files.');
  }
  for (const asset of manifest.assets) {
    const absolutePath = path.join(PROJECT_ROOT, asset.path);
    if (!fs.existsSync(absolutePath)) throw new Error(`Missing asset: ${asset.path}.`);
    const buffer = fs.readFileSync(absolutePath);
    const metadata = await sharp(buffer).metadata();
    if (metadata.format !== 'webp' || metadata.width !== asset.width || metadata.height !== asset.height) {
      throw new Error(`Asset metadata mismatch: ${asset.id}.`);
    }
    if (Boolean(metadata.hasAlpha) !== asset.alpha) throw new Error(`Asset alpha mismatch: ${asset.id}.`);
    if (sha256(buffer) !== asset.sha256) throw new Error(`Asset checksum mismatch: ${asset.id}.`);
  }
  return true;
}

function requireR2Config(env = process.env) {
  const missing = REQUIRED_R2_ENV.filter((name) => !String(env[name] || '').trim());
  if (missing.length) throw new Error(`Missing R2 secrets: ${missing.join(', ')}.`);
  return {
    bucket: env.R2_BUCKET,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL.replace(/\/+$/, ''),
    clientOptions: {
      region: 'auto',
      endpoint: env.R2_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY
      }
    }
  };
}

async function headObject(client, bucket, asset) {
  try {
    const result = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: asset.r2Key }));
    const remoteChecksum = result.Metadata?.sha256 || '';
    if (remoteChecksum !== asset.sha256 || result.ContentType !== asset.mimeType) {
      throw new Error(`R2 collision at ${asset.r2Key}.`);
    }
    return { state: 'identical' };
  } catch (error) {
    const status = error?.$metadata?.httpStatusCode;
    if (error?.name === 'NotFound' || status === 404) return { state: 'missing' };
    throw error;
  }
}

async function preflight(client, bucket, manifest) {
  const objects = [];
  for (const asset of manifest.assets) {
    objects.push({ ...asset, ...(await headObject(client, bucket, asset)) });
  }
  return objects;
}

async function rollback({ client, bucket, rollbackPath }) {
  const rollbackManifest = JSON.parse(fs.readFileSync(rollbackPath, 'utf8'));
  if (rollbackManifest.version !== 1 || rollbackManifest.kind !== 'active-quest-r2-rollback') {
    throw new Error('Rollback manifest is not owned by this script.');
  }
  if (rollbackManifest.status !== 'uploaded') {
    throw new Error(`Rollback manifest is not eligible for deletion: ${rollbackManifest.status || 'unknown'}.`);
  }
  if (!Array.isArray(rollbackManifest.createdObjects)) throw new Error('Malformed rollback manifest.');
  for (const object of rollbackManifest.createdObjects) {
    if (!EXPECTED_PATHS.has(object.path) || !object.r2Key || !object.sha256) {
      throw new Error('Rollback manifest contains an unowned object.');
    }
    const state = await headObject(client, bucket, object);
    if (state.state === 'identical') {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.r2Key }));
    }
  }
  rollbackManifest.status = 'rolled_back';
  rollbackManifest.rolledBackAt = new Date().toISOString();
  writePrivateJson(rollbackPath, rollbackManifest);
  return rollbackManifest.createdObjects.length;
}

async function verifyPublicAssets(manifest, publicBaseUrl, fetchImpl = fetch) {
  for (const asset of manifest.assets) {
    const url = `${publicBaseUrl.replace(/\/+$/, '')}/${asset.r2Key}`;
    const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (response.status !== 200) throw new Error(`Public asset returned HTTP ${response.status}: ${asset.r2Key}.`);
    const contentType = String(response.headers.get('content-type') || '').split(';')[0].trim();
    if (contentType !== asset.mimeType) throw new Error(`Public asset MIME mismatch: ${asset.r2Key}.`);
    const checksum = sha256(Buffer.from(await response.arrayBuffer()));
    if (checksum !== asset.sha256) throw new Error(`Public asset checksum mismatch: ${asset.r2Key}.`);
  }
  return true;
}

async function applyUploads({ client, bucket, manifest, objects, rollbackPath }) {
  const createdObjects = objects.filter((object) => object.state === 'missing').map(({ state, ...asset }) => asset);
  const rollbackManifest = {
    version: 1,
    kind: 'active-quest-r2-rollback',
    releaseId: manifest.releaseId,
    bucket,
    createdAt: new Date().toISOString(),
    status: 'uploading',
    createdObjects: []
  };
  writePrivateJson(rollbackPath, rollbackManifest, { exclusive: true });
  try {
    for (const asset of createdObjects) {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: asset.r2Key,
        Body: fs.readFileSync(path.join(PROJECT_ROOT, asset.path)),
        ContentType: asset.mimeType,
        Metadata: { sha256: asset.sha256, release: manifest.releaseId }
      }));
      rollbackManifest.createdObjects.push(asset);
      writePrivateJson(rollbackPath, rollbackManifest);
    }
    rollbackManifest.status = 'uploaded';
    rollbackManifest.uploadedAt = new Date().toISOString();
    writePrivateJson(rollbackPath, rollbackManifest);
    return createdObjects;
  } catch (error) {
    const cleanupErrors = [];
    for (const asset of rollbackManifest.createdObjects.reverse()) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: asset.r2Key }));
      } catch (cleanupError) {
        cleanupErrors.push(`${asset.r2Key}: ${cleanupError.message}`);
      }
    }
    rollbackManifest.status = cleanupErrors.length ? 'cleanup_failed' : 'cleaned_after_error';
    rollbackManifest.cleanupErrors = cleanupErrors;
    writePrivateJson(rollbackPath, rollbackManifest);
    throw error;
  }
}

async function main(argv = process.argv.slice(2), dependencies = {}) {
  const manifestPath = argumentValue(argv, 'asset-manifest') || DEFAULT_MANIFEST;
  const manifest = loadManifest(path.resolve(manifestPath));
  await validateAssets(manifest);

  const apply = argv.includes('--apply');
  const rollbackPath = argumentValue(argv, 'rollback');
  if (!apply && !rollbackPath) {
    console.log(JSON.stringify({ mode: 'dry-run', releaseId: manifest.releaseId, assets: manifest.assets.length, mutation: false }, null, 2));
    return;
  }

  const config = requireR2Config(dependencies.env || process.env);
  const client = dependencies.client || new S3Client(config.clientOptions);
  if (rollbackPath) {
    const removed = await rollback({ client, bucket: config.bucket, rollbackPath: path.resolve(rollbackPath) });
    console.log(JSON.stringify({ mode: 'rollback', removed }, null, 2));
    return;
  }

  const outputPath = argumentValue(argv, 'rollback-manifest');
  if (!outputPath) throw new Error('Apply requires --rollback-manifest=/absolute/path.json.');
  const objects = await preflight(client, config.bucket, manifest);
  const uploaded = await applyUploads({ client, bucket: config.bucket, manifest, objects, rollbackPath: path.resolve(outputPath) });
  try {
    await verifyPublicAssets(manifest, config.publicBaseUrl, dependencies.fetchImpl || fetch);
  } catch (error) {
    if (uploaded.length) {
      await rollback({ client, bucket: config.bucket, rollbackPath: path.resolve(outputPath) });
    }
    throw error;
  }
  console.log(JSON.stringify({
    mode: 'apply',
    releaseId: manifest.releaseId,
    uploaded: uploaded.length,
    publicUrls: manifest.assets.map((asset) => `${config.publicBaseUrl}/${asset.r2Key}`),
    rollbackManifest: path.resolve(outputPath)
  }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}

module.exports = {
  EXPECTED_PATHS,
  applyUploads,
  headObject,
  loadManifest,
  main,
  preflight,
  requireR2Config,
  rollback,
  sha256,
  validateAssets,
  verifyPublicAssets,
  writePrivateJson
};
