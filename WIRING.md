# MTTI Smart Campus: setup, what changed, and honest status

## 1. Run it

**Backend** (Node 18+; MySQL 8 / MariaDB)
```bash
cd backend
rm -rf node_modules && npm install
cp .env.example .env          # set DB_*, JWT_SECRET, and the REAL campus coordinates (CAMPUS_LAT/LNG/RADIUS_M)
npm run dev                   # creates all tables + applies schema additions automatically on start
```
**First-time setup is done in the app, not in the database:**
1. Open `http://localhost:5173/auth/register` > **Administrator** and register. **The first Administrator is approved automatically**, so do this straight after deploying (whoever registers first becomes the Administrator). Later Administrators need approval.
2. Sign in. On the Administrator pages: **Classes** > add your classes (students and reps pick from this list when they register), **Staff** > add Teachers and HODs directly, or approve the ones who registered themselves.
3. Teachers, HODs and later Administrators can also register themselves from `/auth/register`; they stay *pending* until an Administrator approves them. Class reps stay pending until the HOD approves them.

A teacher's **name must match** the lecturer name class reps pick when starting a session (that is how lessons are linked to teachers; only active teachers appear in that list).
Fallback if you are locked out: `npm run create-user -- --role admin --name "..." --email ... --password "..."` in `backend`.

**Frontend**
```bash
cd frontend
rm -rf node_modules && npm install      # the node_modules in the original zip was corrupt
cp .env.example .env
npm run dev                              # http://localhost:5173 (proxies /api and /socket.io to the backend)
```
**Phones:** camera and GPS need HTTPS. Set `VITE_HTTPS=1` in `frontend/.env`, restart, open `https://<laptop-ip>:5173`.
Set the same campus coordinates in `frontend/.env` (`VITE_CAMPUS_*`) as in `backend/.env`; the server is the authority.

**Vercel production:** set `VITE_API_BASE_URL` to the public HTTPS backend URL ending in `/api` (for example, `https://api.your-domain.ac.ke/api`) and redeploy. The frontend uses the Node/MySQL backend for sign-in, registration, and application data; the backend must remain reachable from browsers. Do not point this setting at a temporary localtunnel URL. `VITE_API_URL` is still accepted as a legacy alias, but `VITE_API_BASE_URL` takes precedence.

**Railway backend:** deploy the `backend` directory as the service root, add a Railway MySQL service, and map `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` to that service's private connection variables. Set `PORT` to Railway's injected port, `JWT_SECRET` to a long random secret, `FRONTEND_URL` to the Vercel site URL, `WEBAUTHN_ORIGINS` to the exact frontend origin, `WEBAUTHN_RP_ID` to its hostname, and `STORAGE_ROOT=/data`. Attach a persistent volume to the backend service at `/data` so face uploads, timetable files, and daily backend logs survive restarts. Logs are written to `/data/logs/backend-YYYY-MM-DD.log` by default; `LOG_RETENTION_DAYS` defaults to 14, and Railway's live console logs continue to work. Set the campus environment (`CAMPUS_LAT=-0.0663`, `CAMPUS_LNG=37.6642`, `CAMPUS_RADIUS_M=10000`) and keep the frontend's `VITE_CAMPUS_*` settings in sync. Class reps may generate rotating QR codes from anywhere; student attendance still requires the campus geofence, a location within 20 m of the rep when the QR was generated, a passkey, an internet connection, and the student's registered phone. After deploying, set Vercel's `VITE_API_BASE_URL` to the backend's public URL plus `/api`, then redeploy the frontend.

**Background notifications:** generate a VAPID key pair with `npx web-push generate-vapid-keys`, then set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and a contact `VAPID_SUBJECT` (for example `mailto:admin@mtti.ac.ke`) on the backend service. Keep the private key secret and never add it to Vercel or a `VITE_` variable. Keep the key pair stable; replacing it requires affected devices to subscribe again. After redeploying the backend, each user enables notifications from the bell while signed in; the browser asks for notification permission and saves that device's subscription. The backend checks each user's existing role-based notifications every minute and sends new items to opted-in devices, including when the app is closed. Push delivery depends on browser/device support, internet access, and OS notification settings; iOS/iPadOS requires the web app to be installed on the Home Screen.

### Email (forgotten passwords, parent alerts)
Forgotten-password email works for **every kind of user** (student, class rep, teacher, HOD, Administrator). For local development, fill these in `backend/.env` (see `.env.example`) and restart the backend. For the live Railway backend, add them as variables to the Railway **backend service**; a local `.env` or `.env.example` does not configure Railway. Railway restarts the service after variables are changed.
```
EMAIL_HOST=smtp.gmail.com      # your provider's SMTP server
EMAIL_PORT=587                 # 587 = STARTTLS (EMAIL_SECURE=false), 465 = secure (EMAIL_SECURE=true)
EMAIL_USER=yourname@gmail.com
EMAIL_PASS=<app password>      # Gmail: Google Account > Security > 2-Step Verification > App passwords
FRONTEND_URL=https://mtti-smart-attendance.vercel.app
```
Never put an actual email password in `.env.example`, source control, Vercel variables, or a `VITE_` variable. If a credential has been shared or committed, revoke it with the email provider and create a replacement before configuring Railway.
Then, as Administrator, open **Settings > Email > Send test email**: it tells you in plain words if the password is wrong, the server can't be reached, or the port/TLS setting is off. How it behaves:
- The email has a **"Choose a new password" button** (a link to the app). The link works **once, for 1 hour**; asking again replaces the earlier link. Only a **hash** of the code is stored.
- The "forgot password" form answers **the same way for every address** and sends nothing for unknown, pending, rejected or deactivated accounts, so nobody can use it to find out who has an account. At most 5 requests per address (and 20 per IP) per 15 minutes.
- After a reset (or when an Administrator sets a staff password) **all old sessions are signed out**, and a "your password was changed" email is sent.
- `FRONTEND_URL` is never taken from the request (that would let an attacker aim reset links at their own site). If it is unset, the email carries a code to type in instead of a link.
- Until email is configured the form says reset email isn't set up yet, and in development the link/code is printed in the backend console. Class reps/HOD cannot reset student passwords yet; if email is down, an Administrator can set **staff** passwords (Admin > Staff).
- I could not send a real email from the build environment (no network), so this was tested against a fake SMTP server speaking the real protocol. **Please run "Send test email" with your real settings.**

### Top bar: Install app and notifications
- **Install app** installs the portal like an app (phone home screen / desktop). Browsers only allow this over **HTTPS**; on plain `http://` the button explains that. Hidden once installed.
- **Bell** shows what needs your attention, by role, computed live (nothing stored): students (attendance open now, attendance below 75%, class announcements, temp-ID decisions, recent approved timetable), class reps (temp IDs waiting, timetable decision, Friday-Sunday "print the register" reminder), teachers (lessons waiting for signature), HOD (reps / timetables awaiting approval, students at risk), Administrator (staff awaiting approval, email not set up, term start not set). "Read" is remembered per person in their browser. It refreshes every minute.
- **Background push alerts** (button inside the bell, HTTPS only) use browser push subscriptions and the service worker to notify opted-in users about new role-based bell items, even if the app is closed. Users must opt in on each device; iOS/iPadOS requires the installed Home Screen app.
printed in the backend console and parent alerts are only logged.

## 2. The flow, end to end
0. Administrator adds classes (with their **department**), sets the **term start date** (Admin > Settings), and approves/adds staff. The MTTI logo appears on the sign-in and every registration page.
1. Student/rep registers (rep waits for HOD approval at **HOD > Approve Reps**).
2. Rep: **Attendance QR** > pick unit + lecturer > Start. A signed code rotates every 25 s.
3. Student: **Scan** > QR > passkey verification > GPS > upload. The trainee must be online and have an enrolled passkey; legacy offline attendance queue items are rejected. Server checks: signature + freshness, session is live and for the student's class, campus geofence, within 20 m of the rep's GPS position signed into the QR, registered device, passkey assertion bound to the session/QR/location/device, one check-in per session, and late threshold. The saved attendance record includes the estimated GPS distance from the representative. Points, badges and attendance % update. Class reps can generate QR codes from anywhere (there is no campus restriction on generation). Class reps can also enter their own 8-digit, short-lived code shown beside the QR and complete the same selfie/GPS/device-protected check-in without scanning their display.
4. Class reps use **Class Chat** to read and post messages in their class room; **Announcements** remains available for highlighted notices.
4. Offline: the scan (selfie included) is queued on the phone and uploaded later with the time it was really taken.
5. Rep sees the live list; teacher signs the lesson; HOD sees at-risk/barred students, approves timetables, generates ministry PDFs.
6. **Friday: the weekly attendance register.** The class rep opens **Weekly Sheet** (a reminder shows on their dashboard Friday to Sunday), downloads the PDF, prints it, gets the teacher to sign and the HOD to comment. The HOD/Administrator can print any class's register from **Weekly Sheets**. Students and teachers cannot download it (it lists classmates' names; teachers already sign each lesson in the app).

### The weekly register PDF (form MTTI/REG/CUR/01)
Laid out like the paper register: logo and institute name, WEEK / DATE FROM-TO / CLASS / DEPARTMENT / YEAR, CLASS TEACHER and SUBJECT, then a Monday-Friday grid with four slots a day (8-10, 10:30-12:30, 1:30-3:30, 3:35-5:35), TIME IN / TIME OUT, ADM NO and NAME, **a tick for present, a cross for absent, blank where no lesson was held**, then TEACHER'S SIGN and H.O.D'S COMMENTS.
- **One page (set) per subject** (same unit + lecturer). CLASS TEACHER and SUBJECT come from the session; classes over 23 students continue on further pages with the header repeated.
- A lesson goes in the slot whose start is the latest one at most 30 minutes after the lesson began (before 7:30 am counts as slot 1, after 3:05 pm as slot 4). Two lessons of the same subject in one slot merge into one cell.
- A **late** arrival still gets a tick (the paper register has no "late"). Names are printed in capitals.
- **WEEK** = weeks since the **term start date** (Admin > Settings); blank if it isn't set. **DEPARTMENT** is set per class (Admin > Classes); blank if not set. The page warns when either is missing.
- **TIME IN** = when the rep started the lesson; **TIME OUT** = when the rep pressed End session or the teacher signed (blank if neither happened). A "signed" note appears under TEACHER'S SIGN for lessons signed in the app; the teacher can still sign by hand.
- Saturday/Sunday lessons have no column; they are counted in a footer note and appear in the CSV export.

## 3. What the wiring/fix passes changed
- **Frontend:** scaffolding (Vite/Tailwind/index.html), one auth context, all 41 pages routed with role guards, shared UI kit, `useFetch` (loading / real data / real error, **no hardcoded sample data anywhere**), real QR scanner + selfie + GPS + offline queue, registration forms driven by the class list.
- **Backend (new):** ~40 routes for the student, class-rep, teacher, HOD and campus areas; sessions (the old schema made every check-in fail on a foreign key because nothing created a session row); HMAC-signed QR tokens; duplicate-scan block; real attendance %; auth on every route; role guards; device binding that actually engages; Socket.IO authenticated and limited to your own class room; CSV timetable upload; PDF/CSV exports; `create-user` CLI; schema migrations.
- **Fixed existing holes:** unauthenticated API, forgeable QR codes, any user reading any scorecard, any user approving temp IDs, `pool` ReferenceError in password reset, email calls that could hang for minutes.
- **Administrator area** (`/admin/*`): add and delete classes, add staff, approve/reject staff registrations, deactivate/reactivate accounts, set a staff password. Teacher / HOD / Administrator registration pages are linked from `/auth/register`. **Deactivating an account locks the person out immediately** (the token check now looks at the account's status, not just the signature).
- **Logo** (`src/assets/MTTI logo.png`, with a 165 KB web copy `mtti-logo.png`) is in the shared auth layout, so it shows on `/login`, `/auth/register`, `/auth/register-student`, `/auth/register-class-rep` and the staff registration pages.
- `POST /api/classes/request` used to let ANY logged-in user (even a student) create classes. It is now Administrator-only.
- **Timetable upload accepts any file type** (see Known limitations for the rules). Files are stored privately and served only through logged-in routes (rep: own class; student: own class and approved versions only; HOD/admin: all), with `nosniff`, and HTML/SVG/executables can never run in the app. Students can view the latest approved version from the Timetable tab; the HOD can View/Download files before approving.
- Dead scaffold code moved to `frontend/_unused/` (not built). Original oversized icons are in `frontend/design-assets/`.

## 4. How it was verified
| Check | Result |
|---|---|
| `cd backend && npm test`: real Express app over HTTP (multipart photo upload, QR, geofence, device lock, every role incl. Administrator flows, PDFs, sockets at protocol level) | 378 / 378 |
| All 47 pages rendered with the **real JSON the backend returned** (values present, no `undefined`/`NaN`), plus: logo present in the auth layout, `/auth/register` links to all 5 roles, admin pages in pending + normal state. A negative control confirmed the test fails when data is missing | 96 / 96 checks (51 pages) |
| 80 frontend source files compile and bundle; every link has a route; every one of the 83 frontend API calls has a backend route; no dead files | clean |

## 5. NOT verified: please test these yourself
- **Real MySQL.** Tests used SQLite. SQL is in the common subset, but run the flow once on MySQL. Keep Node and MySQL on the same time zone (the "today" boundaries depend on it).
- **A real browser:** camera, GPS, QR decoding, IndexedDB offline queue, service worker, `vite build`, and the Tailwind styling. The tool environment had no browser and the zip's `vite`/`tailwindcss`/`axios` were broken.
- Real `socket.io-client` and `axios` (tested at the wire level instead); React 18 (tests ran on 19); sending email.

**First end-to-end check:** register a student + a rep, approve the rep as HOD, rep starts a session, student scans from a second phone.

## 6. Known limitations (by design or still open)
- The selfie is stored for the lecturer to review; **there is no face matching**. Temporary-ID requests record `face_score = 0` ("not scored").
- Fee balances have no import screen: HOD can set them via `PUT /api/hod/fees/:adm_no {total_fees, paid_amount}`.
- Timetables: a class rep can upload **any file type** (PDF, photo, Word/Excel, CSV, ...; max 10 MB). Only PDF and PNG/JPEG/GIF/WebP can be *viewed* in the browser; every other type is download-only. A CSV with columns `day,start,end,unit,venue,lecturer` is also read into a lesson table. Students can open the newest approved timetable for their own class from the Timetable tab; unapproved versions are not shown or accessible to student accounts. Files are kept in `backend/storage/timetables/` (private, not served publicly, git-ignored): **include that folder in your backups**.
- Open staff sign-up is safe only because of the approval step. Until the first Administrator exists, the first person to register as Administrator takes the role.
- Weekly register: lessons are placed by their **start time**, so a rep who starts the QR very late may put a lesson in the neighbouring slot. Printed ticks come from the app's records only, and the paper still needs the teacher's and HOD's signatures.
- Login is by email only. Accounts are active immediately (no email confirmation). SMS parent alerts are not wired.
- A class rep can create a student account from **Class members > Add student** by setting a password (minimum 8 characters). The password is stored as a hash; give the student their email and password securely so they can sign in.
- **Device lock.** A student or class rep is bound to the first device/browser they sign in on. Anyone who gets **"Device mismatch"** (new phone, cleared browser data, or using a different address, e.g. `localhost:5173` vs `192.168.x.x:5173`, which the browser treats as different) is fixed by the HOD or Administrator: **HOD > Device Locks**, search the person (name, admission number or email), **Reset device**, then they sign in again and the new device is registered. Class reps can also do it for their own class (Class members > Reset phone). No database edits needed. While testing, always open the app from the same address.
- The default `JWT_SECRET` is only for development. Set a long random value (and optionally `QR_SECRET`) in production.
