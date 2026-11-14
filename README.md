# Centralized Assignment Submission and Evaluation Platform

A simple web app where faculty publish assignments, students upload their work, and faculty give marks and feedback, all in one place.

**Live demo:** https://spm-project-bkos.onrender.com


---

## About the Project

Many departments collect assignments through email or chat, which is messy and hard to track. This platform puts everything in one place:

- Faculty create and publish assignments with deadlines.
- Students upload a file before the deadline.
- Faculty review each file and give marks with feedback.
- Both sides get a dashboard to see progress.

Built for the Software Project Management course at IIIT Vadodara.

---

## Features

**For Faculty**
- Create, edit, publish, and delete assignments
- Set and extend deadlines
- See who has submitted and who has not
- Download submissions and give marks with feedback
- Dashboard with class progress and a list of work waiting for marks

**For Students**
- See all published assignments in one place
- Upload a PDF, DOCX, or ZIP file (up to 15 MB)
- Replace a file until it has been evaluated
- View marks and feedback on the Results page
- Dashboard with pending and completed work

**General**
- Secure login for two roles: student and faculty
- Deadlines are checked on the server, so late uploads are blocked
- Uploaded files are kept safely in cloud storage

---

## Tech Stack

| Part | Technology |
| --- | --- |
| Frontend | React, Vite, React Router, Axios |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Login and security | JWT, bcrypt |
| File uploads | Multer (local), Cloudinary (online) |
| Hosting | Render, MongoDB Atlas |

---

## Run It on your specific device 

**You need:** [Node.js](https://nodejs.org) 18 or newer, and [Docker Desktop](https://www.docker.com/products/docker-desktop) (only to run MongoDB).

**1. Start the database**
```bash
docker compose up -d --wait
```

**2. Install everything**
```bash
npm run install:all
```

**3. Add sample data** (optional)
```bash
npm run seed
```

**4. Start the app**
```bash
npm run dev
```

Open **http://localhost:5173** in your browser. The API runs at http://localhost:5000.

### Sample logins (after running the seed)

| Role | Email | Password |
| --- | --- | --- |
| Faculty | faculty@iiitv.edu.in | Faculty@123 |
| Student | student.aarav@iiitv.edu.in | Student@123 |

> Use the sample data on your own computer only. Never run `npm run seed` on the live database.

### Other useful commands to run 

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the API and website together |
| `npm run build` | Builds the website for production |
| `npm start` | Starts the server (and serves the built website) |
| `npm run seed:reset` | Clears local data and reloads the sample data |

---

## Deploy Online

The app runs as one service on [Render](https://render.com), with [MongoDB Atlas](https://www.mongodb.com/atlas) for data and [Cloudinary](https://cloudinary.com) for files.

**Build command**
```bash
npm install --prefix server && npm install --include=dev --prefix client && npm run build --prefix client
```

**Start command**
```bash
npm start
```

**Environment variables to set on Render**

| Name | What it is |
| --- | --- |
| `NODE_VERSION` | `20` |
| `FILE_STORAGE` | `cloudinary` |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A long random secret |
| `CLIENT_ORIGIN` | Your site address, for example `https://your-app.onrender.com` |
| `CLOUDINARY_CLOUD_NAME` | From your Cloudinary account |
| `CLOUDINARY_API_KEY` | From your Cloudinary account |
| `CLOUDINARY_API_SECRET` | From your Cloudinary account |
| `FACULTY_REGISTRATION_CODE` | A private code faculty enter when they sign up |

Never upload your real `.env` file to GitHub. Add secrets only in Render's Environment settings.

---

## Project Structure

```text
client/    React website (student and faculty screens)
server/    Express API, login, database models, file uploads
scripts/   Helper scripts to start the project
```

---

## Contributors

| Name | GitHub |
| --- | --- |
| Rachita Laad | [@RACHITALAAD](https://github.com/RACHITALAAD) |
| Rasika Kale  | [@rasika2114](https://github.com/rasika2114) |
| Muskan Tomar | [@Vaish-011](https://github.com/Vaish-011)   |
| Viditi Joshi | [@vj2573](https://github.com/vj2573)         |

---

## License

This project was created for academic purposes.
