'use strict';
const express = require('express');
const mongoose = require('mongoose');
const { createThreadedComments, createMongooseRepositories, createExpressCommentsRouter } = require('../..');

const Resource = mongoose.model('ExampleResource', new mongoose.Schema({ slug: { type: String, unique: true }, status: String, commentsCount: { type: Number, default: 0 } }));
const Comment = mongoose.model('ExampleComment', new mongoose.Schema({ resourceId: mongoose.Types.ObjectId, authorId: String, parentCommentId: { type: mongoose.Types.ObjectId, default: null }, replyToCommentId: { type: mongoose.Types.ObjectId, default: null }, content: String, status: { type: String, default: 'active' }, isDeleted: { type: Boolean, default: false }, editCount: { type: Number, default: 0 }, editHistory: { type: Array, default: [] }, lastEditedAt: Date }, { timestamps: true }));
const Report = mongoose.model('ExampleReport', new mongoose.Schema({ targetType: String, resourceId: mongoose.Types.ObjectId, commentId: mongoose.Types.ObjectId, reporterId: String, reason: String, note: String, commentContentSnapshot: String }, { timestamps: true }));

async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  const repositories = createMongooseRepositories({ models: { Comment, Report, Resource }, fields: { resourceId: 'resourceId', resourceKey: 'slug' }, createId: () => new mongoose.Types.ObjectId() });
  const workflow = createThreadedComments({ repositories });
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.actor = req.get('x-example-user') ? { id: req.get('x-example-user') } : null; next(); });
  app.use('/resources/:resourceKey/comments', createExpressCommentsRouter({ express, workflow, resolveActor: (req) => req.actor }));
  app.listen(3100, () => console.log('Example listening on http://localhost:3100'));
}
start();
