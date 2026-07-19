'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const { prepareTermsDraft } = require('../services/terms-draft.service');

(async()=>{
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set.');
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await prepareTermsDraft();
  console.log(result.created ? `Created Terms draft v${result.policy.versionNumber}.` : `Matching Terms draft v${result.policy.versionNumber} already exists.`);
  await mongoose.disconnect();
})().catch(async(error)=>{ console.error('Terms draft preparation failed:', error); try{await mongoose.disconnect();}catch(_error){} process.exit(1); });
