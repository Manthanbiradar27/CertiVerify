# CertiVerify — Packaging Guide

This document describes how to create a clean, safe distribution archive of the project
for submission, deployment handoffs, or peer review.

## What to Include

```
certiverify/
├── .env.example          ← Safe placeholder template (no real credentials)
├── .gitignore
├── package.json          ← Root convenience scripts
├── PACKAGING.md          ← This file
├── client/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   └── src/
└── server/
    ├── package.json
    ├── package-lock.json
    ├── app.js
    ├── server.js
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── models/
    ├── routes/
    ├── scripts/
    ├── services/
    └── tests/
```

## What to Exclude

| Path | Reason |
|---|---|
| `server/.env` | Real credentials — NEVER distribute |
| `client/.env` | Real credentials — NEVER distribute |
| `server/node_modules/` | Reinstalled via `npm install` |
| `client/node_modules/` | Reinstalled via `npm install` |
| `client/dist/` | Build output — regenerated via `npm run build` |
| `.git/` | Full version history — not needed for submission |
| `*.log` | Runtime logs |

## Creating the Archive (Windows PowerShell)

Run from the **parent** folder containing the `BWT HACKATHON` directory:

```powershell
# Navigate to the parent folder first
cd "C:\Users\manth\Desktop"

$project  = "BWT HACKATHON"
$archive  = "certiverify-submission.zip"
$exclude  = @(
    "$project\server\.env",
    "$project\client\.env",
    "$project\server\node_modules",
    "$project\client\node_modules",
    "$project\client\dist",
    "$project\.git",
    "$project\**\*.log"
)

# Build exclusion filter
$items = Get-ChildItem -Path $project -Recurse -Force |
    Where-Object {
        $path = $_.FullName
        -not ($exclude | Where-Object { $path -like "*$_*" })
    } |
    Select-Object -ExpandProperty FullName

Compress-Archive -Path $items -DestinationPath $archive -Force
Write-Host "Archive created: $archive"
```

## Alternative — Using 7-Zip (if installed)

```powershell
7z a -r certiverify-submission.zip "BWT HACKATHON\*" `
    -x!"BWT HACKATHON\server\.env" `
    -x!"BWT HACKATHON\client\.env" `
    -x!"BWT HACKATHON\server\node_modules" `
    -x!"BWT HACKATHON\client\node_modules" `
    -x!"BWT HACKATHON\client\dist" `
    -x!"BWT HACKATHON\.git"
```

## Verifying the Archive

Before submitting, verify no `.env` files with real credentials leaked in:

```powershell
# Should only show .env.example — no server/.env or client/.env
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("certiverify-submission.zip")
$zip.Entries | Where-Object { $_.Name -eq ".env" } | Select-Object FullName
$zip.Dispose()
```

## Recipient Setup Instructions

After extracting the archive:

```bash
# 1. Create server environment file from the template
cp .env.example server/.env
# Edit server/.env and fill in MONGO_URI, JWT_SECRET, etc.

# 2. Create client environment file
echo "VITE_API_BASE_URL=/api" > client/.env

# 3. Install dependencies
cd server && npm install && cd ..
cd client && npm install && cd ..

# 4. Bootstrap the admin account
cd server && npm run create-admin

# 5. Start the application (two terminals)
# Terminal 1:
cd server && npm run dev
# Terminal 2:
cd client && npm run dev
```
