'use strict';

/**
 * Export a DatasetVersion in tesstrain ground-truth layout (Phase 3).
 *
 *   npm run ocr:dataset:export -- --dataset <datasetVersionId> --out /path/to/dir
 *
 * Writes ground-truth/<id>.png + .gt.txt (train + validation), test/<id>.png + .gt.txt
 * (held out) and manifest.json. Every crop is checksum-verified. The output contains
 * participant screenshots' text lines: keep it on access-controlled storage only.
 */

require('dotenv').config();
const path = require('node:path');
const mongoose = require('mongoose');
const DatasetVersion = require('../models/DatasetVersion');
const { materializeDataset, verifyDatasetIntegrity } = require('../services/ocr/dataset.service');

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : '';
}

async function main() {
  const datasetId = arg('dataset');
  const out = arg('out');
  if (!mongoose.isValidObjectId(datasetId) || !out) throw new Error('Usage: --dataset <id> --out <dir>');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: false });
  const dataset = await DatasetVersion.findById(datasetId).lean();
  if (!dataset) throw new Error('Dataset not found.');
  if (!verifyDatasetIntegrity(dataset)) throw new Error('Dataset manifest does not match its hash.');
  const result = await materializeDataset(dataset, path.resolve(out));
  console.log(JSON.stringify({ datasetId, manifestHash: dataset.manifestHash, ...result.written }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('[ocr-dataset-export]', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
