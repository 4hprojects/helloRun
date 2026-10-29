const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  applyUploads,
  loadManifest,
  preflight,
  requireR2Config,
  rollback,
  validateAssets,
  verifyPublicAssets,
  writePrivateJson
} = require('../src/scripts/upload-active-quest-release-assets');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'assets/events/active-quest/release-manifest.json');

function commandName(command) {
  return command.constructor.name;
}

test('Active Quest release manifest validates exact production assets', async () => {
  const manifest = loadManifest(MANIFEST_PATH);
  assert.equal(manifest.releaseId, 'active-quest-public-launch-2026-11');
  assert.equal(manifest.assets.length, 10);
  assert.equal(new Set(manifest.assets.map((asset) => asset.r2Key)).size, 10);
  assert.equal(manifest.assets.filter((asset) => asset.label).length, 6);
  assert.deepEqual(
    manifest.assets.filter((asset) => asset.label).map((asset) => asset.label),
    [
      '25K STARTER QUEST',
      '50K ACTIVE QUEST',
      '75K MOMENTUM QUEST',
      '100K ENDURANCE QUEST',
      '150K DISTANCE QUEST',
      '200K ULTRA QUEST'
    ]
  );
  await assert.doesNotReject(validateAssets(manifest));
});

test('Active Quest release uploader is dry-run by default', () => {
  const result = spawnSync(process.execPath, ['src/scripts/upload-active-quest-release-assets.js'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, R2_BUCKET: '', R2_ACCESS_KEY_ID: '', R2_SECRET_ACCESS_KEY: '', R2_ENDPOINT: '', R2_PUBLIC_BASE_URL: '' }
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /"mode": "dry-run"/);
  assert.match(result.stdout, /"mutation": false/);
});

test('Active Quest release uploader rejects missing secrets', () => {
  assert.throws(() => requireR2Config({}), /Missing R2 secrets: R2_BUCKET/);
});

test('Active Quest release uploader rejects a conflicting object', async () => {
  const manifest = loadManifest(MANIFEST_PATH);
  const client = {
    async send(command) {
      assert.equal(commandName(command), 'HeadObjectCommand');
      return { ContentType: 'image/webp', Metadata: { sha256: '0'.repeat(64) } };
    }
  };
  await assert.rejects(preflight(client, 'bucket', manifest), /R2 collision/);
});

test('Active Quest release uploader cleans objects after a partial failure', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'active-quest-upload-'));
  const rollbackPath = path.join(directory, 'rollback.json');
  const manifest = loadManifest(MANIFEST_PATH);
  const objects = manifest.assets.slice(0, 2).map((asset) => ({ ...asset, state: 'missing' }));
  const commands = [];
  let puts = 0;
  const client = {
    async send(command) {
      commands.push(commandName(command));
      if (commandName(command) === 'PutObjectCommand' && ++puts === 2) throw new Error('simulated upload failure');
      return {};
    }
  };
  try {
    await assert.rejects(
      applyUploads({ client, bucket: 'bucket', manifest, objects, rollbackPath }),
      /simulated upload failure/
    );
    assert.deepEqual(commands, ['PutObjectCommand', 'PutObjectCommand', 'DeleteObjectCommand']);
    assert.equal(JSON.parse(fs.readFileSync(rollbackPath, 'utf8')).status, 'cleaned_after_error');
    assert.equal(fs.statSync(rollbackPath).mode & 0o777, 0o600);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('Active Quest rollback deletes only objects owned by its manifest', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'active-quest-rollback-'));
  const rollbackPath = path.join(directory, 'rollback.json');
  const asset = loadManifest(MANIFEST_PATH).assets[0];
  writePrivateJson(rollbackPath, {
    version: 1,
    kind: 'active-quest-r2-rollback',
    status: 'uploaded',
    createdObjects: [asset]
  });
  const commands = [];
  const client = {
    async send(command) {
      commands.push(commandName(command));
      if (commandName(command) === 'HeadObjectCommand') {
        return { ContentType: asset.mimeType, Metadata: { sha256: asset.sha256 } };
      }
      return {};
    }
  };
  try {
    assert.equal(await rollback({ client, bucket: 'bucket', rollbackPath }), 1);
    assert.deepEqual(commands, ['HeadObjectCommand', 'DeleteObjectCommand']);
    assert.equal(JSON.parse(fs.readFileSync(rollbackPath, 'utf8')).status, 'rolled_back');
    await assert.rejects(rollback({ client, bucket: 'bucket', rollbackPath }), /not eligible for deletion/);

    writePrivateJson(rollbackPath, { version: 1, kind: 'other-tool', createdObjects: [asset] });
    await assert.rejects(rollback({ client, bucket: 'bucket', rollbackPath }), /not owned by this script/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('Active Quest release verifies public MIME and checksum', async () => {
  const manifest = loadManifest(MANIFEST_PATH);
  const fetchImpl = async (url) => {
    const asset = manifest.assets.find((entry) => url.endsWith(entry.r2Key));
    return {
      status: 200,
      headers: { get: () => `${asset.mimeType}; max-age=3600` },
      arrayBuffer: async () => fs.readFileSync(path.join(ROOT, asset.path))
    };
  };
  await assert.doesNotReject(verifyPublicAssets(manifest, 'https://assets.example', fetchImpl));
  await assert.rejects(
    verifyPublicAssets(manifest, 'https://assets.example', async () => ({
      status: 200,
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => Buffer.alloc(0)
    })),
    /MIME mismatch/
  );
});

test('Active Quest rollback manifest cannot overwrite an existing file', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'active-quest-private-manifest-'));
  const rollbackPath = path.join(directory, 'rollback.json');
  try {
    writePrivateJson(rollbackPath, { version: 1 }, { exclusive: true });
    assert.equal(fs.statSync(rollbackPath).mode & 0o777, 0o600);
    assert.throws(() => writePrivateJson(rollbackPath, { version: 2 }, { exclusive: true }), /EEXIST/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
