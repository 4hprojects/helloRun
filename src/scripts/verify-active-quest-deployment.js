require('dotenv').config();

function argumentValue(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((value) => value.startsWith(prefix))?.slice(prefix.length).trim() || '';
}

async function getJson(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  const body = await response.json().catch(() => null);
  return { response, body };
}

async function verifyDeployment({ baseUrl, expectedSha, fetchImpl = fetch }) {
  if (!/^https:\/\//.test(baseUrl)) throw new Error('Use an HTTPS --base-url.');
  if (!/^[0-9a-f]{40}$/i.test(expectedSha)) throw new Error('--expected-sha must be a full 40-character commit SHA.');
  const base = baseUrl.replace(/\/+$/, '');
  const health = await getJson(`${base}/healthz`, fetchImpl);
  if (health.response.status !== 200 || !health.body?.ok) throw new Error('/healthz is not healthy.');
  if (health.body.build?.commit !== expectedSha) {
    throw new Error(`Deployed SHA mismatch: expected ${expectedSha}, got ${health.body.build?.commit || 'unknown'}.`);
  }
  const readiness = await getJson(`${base}/readyz`, fetchImpl);
  if (readiness.response.status !== 200 || !readiness.body?.ok) throw new Error('/readyz is not ready.');
  const landing = await fetchImpl(`${base}/active-quest`, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  if (landing.status !== 200) throw new Error(`/active-quest returned HTTP ${landing.status}.`);
  return { expectedSha, healthz: 200, readyz: 200, activeQuest: 200 };
}

async function main() {
  const result = await verifyDeployment({
    baseUrl: argumentValue('base-url'),
    expectedSha: argumentValue('expected-sha')
  });
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}

module.exports = { getJson, verifyDeployment };
