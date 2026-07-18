'use strict';

const LIFECYCLE_EVENTS = Object.freeze({
  COMMENT_CREATED: 'comment.created',
  REPLY_CREATED: 'reply.created',
  COMMENT_EDITED: 'comment.edited',
  COMMENT_DELETED: 'comment.deleted',
  COMMENT_RESTORED: 'comment.restored',
  COMMENT_REPORTED: 'comment.reported',
  REVISION_REDACTED: 'revision.redacted'
});

function createLifecycleBus() {
  const listeners = new Map();
  return {
    on(name, listener) {
      if (typeof listener !== 'function') throw new TypeError('Lifecycle listener must be a function');
      const group = listeners.get(name) || new Set();
      group.add(listener);
      listeners.set(name, group);
      return () => group.delete(listener);
    },
    async emit(name, payload) {
      const group = [...(listeners.get(name) || []), ...(listeners.get('*') || [])];
      await Promise.all(group.map((listener) => listener(payload, name)));
    }
  };
}

module.exports = { LIFECYCLE_EVENTS, createLifecycleBus };
