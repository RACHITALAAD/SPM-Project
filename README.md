# Centralized Assignment Submission and Evaluation Platform

Department workspace for IIIT Vadodara. Faculty publish assignments. Students upload a PDF, DOCX, or ZIP before the deadline. Faculty award marks and feedback. Both roles have a dashboard for progress.

For local development, uploads are stored with Multer in `server/uploads`, so the project runs without a cloud account. For deployment, the backend can switch to Cloudinary authenticated raw storage so uploaded assignment files survive Render restarts. MongoDB stores the submission records; Cloudinary stores the actual files.

## What you need

- Node.js 18 or newer: https://nodejs.org
- Docker Desktop, used only to start MongoDB

If MongoDB is already running on port 27017, skip the Docker command.

## Run it

From this folder:

```bash
docker compose up -d --wait
npm run install:all
npm run seed
npm run dev
```

Or, on Linux / macOS / WSL:

```bash
chmod +x scripts/start.sh
./scripts/start.sh
```

On Windows PowerShell:

```powershell
.\scripts\start.ps1
```

Open the address Vite prints. It is usually http://localhost:5173

The API runs at http://localhost:5000. During development the web app proxies `/api` to that port.

## Demo accounts

The seed command creates these users. Password for every student is `Student@123`.

| Role | Name | Email | Password |
| --- | --- | --- | --- |
| Faculty | Prof. Ananya Iyer | faculty@iiitv.edu.in | Faculty@123 |
| Student | Aarav Mehta | student.aarav@iiitv.edu.in | Student@123 |
| Student | Diya Patel | student.diya@iiitv.edu.in | Student@123 |
| Student | Kabir Shah | student.kabir@iiitv.edu.in | Student@123 |

Aarav already has one evaluated database assignment and one operating-systems file waiting for marks. Diya’s database file is also waiting. Kabir has not submitted anything. The Software Project Management assignment is still a draft, so students cannot see it until it is published.

In local development, the sign-in page can fill the faculty and Aarav demo accounts. These demo buttons are hidden in production builds.

To wipe the local database and load this sample again:

```bash
npm run seed:reset
```

Do not run the seed or seed:reset command against your production MongoDB database. The sample accounts use published demo passwords and the sample submission files are local development files.

## What to show

1. Sign in as faculty. The dashboard shows class progress and a queue of work that still needs marks.
2. Open the draft, or create a new assignment, then publish it. Students only see published assignments.
3. Sign in as Kabir and upload a PDF, DOCX, or ZIP. The submission stores the upload time.
4. Sign back in as faculty, open that submission, and save marks plus feedback.
5. Sign in as the student again. The marks and feedback are on the assignment and on Results.

Deadlines are enforced on the server. After the deadline, upload is refused. Faculty can extend the deadline from Edit. A student can replace a file until it has been evaluated. An assignment that already has submissions cannot be deleted or moved back to draft.

## Useful commands

```bash
npm run dev          # API and web app together
npm run dev:api      # API only, http://localhost:5000
npm run dev:web      # web app only, http://localhost:5173
npm run build        # production web build
npm start            # API, and the web build if client/dist exists
```

You can also use two terminals:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

## Project layout

```text
client/     React screens for student and faculty
server/     Express API, JWT auth, MongoDB models, Multer uploads
scripts/    One-command start scripts
```

Collections: Users, Assignments, Submissions, Evaluations.

Main API routes:

- `POST /api/auth/register` and `POST /api/auth/login`
- `GET/POST /api/assignments`, `PUT/DELETE /api/assignments/:id`, `PATCH /api/assignments/:id/publish`
- `POST /api/assignments/:id/submit` for the file upload
- `GET /api/submissions/mine` and `GET /api/submissions/assignment/:id`
- `POST /api/submissions/:id/evaluate`
- `GET /api/dashboard`

## If it does not start

- `docker compose up -d --wait` failed: start Docker Desktop, or free port 27017.
- `npm` is not found: install Node.js 18+ and open a new terminal.
- The page says it cannot reach the server: keep `npm run dev` running and use the Vite URL, not a file opened from the desktop.
- Seed says users already exist: that is fine. Use `npm run seed:reset` only when you want the sample data back.
- Change `JWT_SECRET` in `server/.env` before using this anywhere except a local demo.


## Cloud deployment storage settings

The default `FILE_STORAGE` mode is `local`, which preserves the original local-development workflow and uses `server/uploads`.

For a Render deployment with persistent assignment files, configure these environment variables in Render:

```env
FILE_STORAGE=cloudinary
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_secret
CLIENT_ORIGIN=https://your-render-service.onrender.com
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FACULTY_REGISTRATION_CODE=your_private_faculty_registration_code
```

When `FILE_STORAGE=cloudinary`, new PDF, DOCX, and ZIP submissions are uploaded to Cloudinary as authenticated raw assets. The backend checks the user's access before generating a short-lived download URL. The local `server/.env` file must never be committed to GitHub; use Render's Environment settings for production secrets.

Cloudinary uses Node.js built-in `fetch`, `FormData`, and `Blob`; no additional Cloudinary npm package is required. Node.js 20 is recommended (the repository `.nvmrc` is set to 20).

To test locally with Cloudinary, add the Cloudinary values to `server/.env` and change `FILE_STORAGE=local` to `FILE_STORAGE=cloudinary`. To keep the original local-file workflow, leave `FILE_STORAGE` unset or set it to `local`.
