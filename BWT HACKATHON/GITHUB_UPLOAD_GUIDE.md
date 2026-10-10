# GitHub Upload and Local Setup Guide

## Before publishing

- Never commit `server/.env` or `client/.env`.
- Keep real credentials out of source code and Git history.
- This archive intentionally excludes `.git`, `node_modules`, and generated build output.
- `.env.example` files contain safe local examples/placeholders only. Replace local settings as needed.

## Local setup (Windows PowerShell)

1. Install a Node.js version compatible with the Vite version in `client/package.json`.
2. Install and start MongoDB locally, or configure an authorized MongoDB deployment.
3. In the project root, copy the server template:

   ```powershell
   Copy-Item .env.example server/.env
   ```

4. Edit `server/.env` privately. Set `MONGO_URI` to your own database and generate a strong random `JWT_SECRET`. Do not share these values.
5. Create the frontend environment file:

   ```powershell
   Copy-Item client/.env.example client/.env
   ```

6. Install and start the backend in terminal 1:

   ```powershell
   cd server
   npm install
   npm run dev
   ```

7. Install and start the frontend in terminal 2:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

8. Open the local URL printed by Vite (usually `http://localhost:5173`).

The exact setup can depend on MongoDB, email, and admin-bootstrap configuration. Check the main README and package scripts. Do not run database tests until `TEST_MONGO_URI` is configured to a separate test database.

## GitHub publishing (from project root)

1. Inspect the files to be staged:

   ```powershell
   git status --short --ignored
   ```

2. Stage files and inspect the complete staged list before committing:

   ```powershell
   git add .
   git diff --cached --name-only
   ```

3. Confirm no real `.env` files, credentials, `node_modules`, `.git`, or `dist` output are staged. Then commit:

   ```powershell
   git commit -m "Initial commit: CertiVerify"
   ```

4. Create an empty repository on GitHub, then add its HTTPS URL and push:

   ```powershell
   git remote add origin https://github.com/YOUR-USERNAME/CertiVerify.git
   git branch -M main
   git push -u origin main
   ```

If a Git repository already exists or secrets were committed previously, inspect its remote/history first. `.gitignore` does not remove files from previous commits. Rotate exposed credentials and clean Git history before making the repository public.
