# QueueFlow – Digital Queue & Token Management System

## Requirements
- Node.js 18+ (Node.js 22 recommended)
- npm

## Run the project
1. Open PowerShell/Command Prompt in this folder.
2. Install dependencies:
   `npm install`
3. Start the server:
   `npm start`
4. Open:
   `http://localhost:3000`

If port 3000 is already in use, run:
`$env:PORT=3001; npm start`
Then open `http://localhost:3001`.

## Features
- Generate a token for a selected service
- Token detail page with people-ahead count
- Search token status by token number
- Admin dashboard with current token, queue and today's statistics
- Call next token; previous serving token is completed automatically
- Add services with unique prefixes
- Protect service history from accidental deletion
- JSON-file persistence in `data/`

## Important corrections made
- Added missing POST/DELETE service API endpoints.
- Added missing `/api/tokens/number/:tokenNumber` endpoint used by Status page.
- Standardized token statuses to lowercase across backend and frontend.
- Fixed `name` vs `customerName` field mismatch.
- Added `date` to new tokens and legacy-token fallback for today's statistics.
- Fixed admin queue/current/statistics logic and service filtering.
- Fixed token-page status navigation.
- Added validation, duplicate-service/prefix checks, safer token IDs and clearer API errors.
- Fixed responsive styling and inconsistent CSS class names.
- Added graceful `EADDRINUSE` handling.
- Removed `node_modules` from the submission archive; run `npm install` after extracting.

## Test flow
1. Home → select a service → enter a name → Generate Token.
2. The token page shows the generated token and people ahead.
3. Check Status → enter the token number (for example `A001`).
4. Admin → select the same service → Call Next Token.
5. The token changes to Serving; calling Next again completes it and serves the next waiting token.
6. Services → add a service and verify it appears on Home/Admin.


## Verified/fixed controls
- Home: service loading, token generation, validation and redirect.
- Token page: token details, people-ahead count, status refresh and Check Queue Status button.
- Check Status: search button, Enter key, all token states and automatic URL lookup.
- Admin: service selector, Call Next Token, Complete, Skip and Cancel actions, live queue and statistics refresh.
- Services: add service, duplicate validation, delete service and consistent navigation.
- Statistics now use the server's local calendar date rather than UTC.


## Deployment notes (Render)
1. Push this project to a GitHub repository. Do not commit `.env`, passwords, or other secrets.
2. Create a Render **Web Service** connected to the repository. Use build command `npm install` and start command `npm start`.
3. In Render → Environment, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` to strong, unique values. Admin pages and admin/service-management endpoints return an error until these are configured.
4. The app currently stores data in `data/services.json` and `data/tokens.json`. On hosts with ephemeral filesystems, changes may be lost during redeploys/restarts. For persistent public use, migrate storage to a database or use a persistent disk supported by your hosting plan.
5. The admin panel uses HTTP Basic Authentication. Use HTTPS (Render provides it) and do not reuse your personal passwords.

### Local admin access (PowerShell)
```powershell
$env:ADMIN_USERNAME="admin"
$env:ADMIN_PASSWORD="replace-with-a-long-password"
npm install
npm start
```
Open `http://localhost:3000/admin.html`; your browser will prompt for the admin credentials. The services management page is protected the same way.
