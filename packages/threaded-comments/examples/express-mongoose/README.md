# Express/Mongoose example

This example is intentionally small and uses an in-memory MongoDB-compatible connection supplied by the host test environment. Copy `server.js`, install Express and Mongoose, set `MONGODB_URI`, then run:

```bash
npm install
MONGODB_URI=mongodb://127.0.0.1:27017/threaded-comments-example node server.js
```

The sample authentication middleware accepts `x-example-user` only to demonstrate actor injection. It is not production authentication.
