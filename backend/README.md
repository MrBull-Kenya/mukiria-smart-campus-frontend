# Backend deployment

This service is deployed from this directory in the GitHub repository. Set the
Railway service root directory to `/backend`; `railway.json` supplies the start
command and `/api/health` health check.

Connect the service to a Railway MySQL database and configure `DB_HOST`,
`DB_USER`, `DB_PASSWORD`, and `DB_NAME` with the database's private connection
variables. Configure `JWT_SECRET`, `FRONTEND_URL`, and the campus coordinates
from `.env.example` in Railway's service variables. Do not commit a `.env` file.

Attach a persistent Railway volume at `/data` and set `STORAGE_ROOT=/data` so
uploaded face images, timetables, and application logs survive redeploys. The
server applies its schema migrations before it begins listening; a migration or
database connection failure prevents the service from starting.
