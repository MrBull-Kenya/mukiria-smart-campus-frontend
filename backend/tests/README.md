# Backend integration tests

`npm test` boots the real Express app (all routes, middleware, controllers, multer uploads, Socket.IO) on an
in-memory SQLite database and drives it over HTTP as a student, class rep, teacher and HOD.
Only `src/config/db.js` is swapped for `tests/sqlite-db.js`; no MySQL server is needed (Node 22+).

SQLite is not MySQL: the app's SQL is written in the common subset, but run the app against a real MySQL once
before relying on it (see WIRING.md).
