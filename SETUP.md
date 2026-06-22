# ECE Clinic Portal — Setup Guide

A consultation queue + online consultation portal. Frontend is a single static
page (`public/index.html`). Backend is Vercel serverless functions that read and
write a **Google Sheet** and create **Google Meet** links via **Google Calendar**.
The official consultation form is your **Zoho Creator "Clinic Visits" form**,
embedded in the nurse/doctor view.

The app runs immediately in **demo mode** (built-in mock data, no backend). Wiring
up the backend is what makes it real and persistent.

---

## 0. What you'll end up with

- **Login** for four roles: nurse, doctor, admin, employee.
- **Staff portal** (nurse/doctor/admin): aux status selector (Available, Not
  Available, Consultation Ongoing, Break, Lunch), booking queue, a Google
  Calendar view, and the embedded Zoho Clinic Visits form.
- **Employee view**: only available staff + a booking request form (with required
  ID number). If no onsite staff is available, the form defaults to an online
  (Google Meet) consultation.
- **Public booking page** (no login) for the same booking request.
- **Online consultations** get an auto-generated Google Meet link.

---

## 1. The Google Sheet (your only datastore)

Create one Google Sheet. Add **three tabs** with these exact header rows in row 1.

**Tab `Users`** (login accounts)
```
email | password | name | role | id
```
- `role` is one of: `nurse`, `doctor`, `admin`, `employee`
- `id` should match the `id` you use in the `Staff` tab for clinical staff
- ⚠️ Passwords are compared as plain text in `api/login.js`. Before going live,
  switch to hashed passwords (see step 7).

**Tab `Staff`** (who appears in the portal + their live status)
```
id | name | role | email | status
```
- `status` is one of: `available`, `notavailable`, `consultation`, `break`, `lunch`
- Only `nurse` and `doctor` rows show in the employee "Available now" list.

**Tab `Bookings`**
```
id | employee | idNumber | reason | mode | date | status | assignedTo | meet | eventId
```
- Leave empty except headers; the app fills this. `mode` is `online`/`onsite`,
  `status` is `pending`/`confirmed`/`completed`, `date` is ISO.

> Records/consultations themselves live in **Zoho** (the Clinic Visits form), so
> there's no separate consult tab needed unless you want one.

Copy the **Sheet ID** — it's the long string between `/d/` and `/edit` in the URL.

---

## 2. Google Cloud: service account + APIs

1. Go to <https://console.cloud.google.com> → create or pick a project.
2. **APIs & Services → Enable APIs** → enable **Google Sheets API** and
   **Google Calendar API**.
3. **IAM & Admin → Service Accounts → Create service account**.
   - Give it a name like `ece-clinic`. No roles needed. Create.
4. Open the service account → **Keys → Add key → JSON**. A `.json` file downloads.
   Keep it safe; never commit it.
5. Note the service account **client_email** (looks like
   `ece-clinic@yourproject.iam.gserviceaccount.com`).

### Share the Sheet with the service account
Open your Google Sheet → **Share** → paste the service account `client_email` →
give **Editor** access. This lets it read/write without impersonation.

---

## 3. Domain-wide delegation (required for Google Meet links)

A service account **cannot** create a Meet link on its own. It must impersonate a
real Workspace user. You have Workspace, so:

1. In the service account details, copy its **Client ID** (a long number under
   "Unique ID" / "OAuth 2 Client ID").
2. Go to **Google Admin console** (<https://admin.google.com>, as a super admin)
   → **Security → Access and data control → API controls → Domain-wide
   delegation → Manage domain-wide delegation → Add new**.
3. Paste the **Client ID** and these scopes (comma-separated):
   ```
   https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/calendar.events
   ```
4. Save. Propagation can take a few minutes.
5. Pick a real user the service account will act as — e.g. `clinic@yourdomain.com`.
   That user's primary calendar will hold the consultation events (or set a
   dedicated calendar via `CALENDAR_ID`).

---

## 4. Put the code on GitHub

```bash
cd ece-clinic
git init
git add .
git commit -m "ECE clinic portal"
git branch -M main
git remote add origin https://github.com/<you>/ece-clinic.git
git push -u origin main
```
`.gitignore` already excludes `node_modules`, `.env`, and the service-account file.

---

## 5. Deploy on Vercel

1. <https://vercel.com> → **Add New → Project** → import the GitHub repo.
2. Framework preset: **Other**. Leave build command empty; output is static +
   serverless (handled by `vercel.json`).
3. **Settings → Environment Variables** — add (from `.env.example`):
   - `SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_JSON` — paste the JSON. Easiest: base64-encode it
     first (`cat service-account.json | base64 -w0`) and paste that; the code
     handles both raw JSON and base64.
   - `CLINIC_USER` = the impersonated user, e.g. `clinic@yourdomain.com`
   - `CALENDAR_ID` (optional)
4. **Deploy.**

---

## 6. Point the frontend at your API

In `public/index.html`, near the top of the main script:

```js
const API_BASE = "";  // demo mode
```
Set it to your deployment's API path:
```js
const API_BASE = "https://your-app.vercel.app/api";
```
Commit and push — Vercel redeploys. The app now reads/writes the Sheet and creates
Meet links instead of using mock data.

---

## 7. Embed your Zoho "Clinic Visits" form

The nurse/doctor view embeds your Zoho form. In `public/index.html`:

```js
const ZOHO_FORM_URL = "https://creatorapp.zoho.com/ececonsultinggroup/ece-time-tracker/#Clinic_Visits";
```

The link above is the **private in-app** URL — Zoho will usually block it inside an
iframe, so the portal automatically shows an **"Open in new tab"** fallback. For a
clean inline embed, generate a **published permalink**:

1. In Zoho Creator, open the **Clinic Visits** form.
2. **Access this application** (or the form's **⋯ → Embed / Publish**) →
   **Permalink**.
3. Choose access (public, or "logged-in users only").
4. Copy the permalink URL and paste it into `ZOHO_FORM_URL`. Push.

The embed passes the patient's ID as `?ID_Number=...` when launched from a booking;
if your form's field name differs, adjust it in the `zohoEmbedHTML` function, or
ignore it (harmless).

---

## 8. Security hardening before real use

- **Hash passwords.** Replace the plain comparison in `api/login.js` with a bcrypt
  check, and store bcrypt hashes in the `Users` tab.
- **Add sessions/tokens.** Right now the frontend trusts the login response. For
  production, issue a signed token (e.g. JWT) from `api/login.js` and verify it in
  the other endpoints.
- **Restrict CORS.** `_google.js` sets `Access-Control-Allow-Origin: *` for easy
  setup. Lock it to your Vercel domain.
- **Rate-limit** the public `book` endpoint to prevent spam.

---

## Local development

```bash
npm install
npm i -g vercel
vercel dev          # serves the static page + /api functions locally
```
Set the same env vars in a local `.env` (gitignored) for `vercel dev`.

---

## File map

```
ece-clinic/
├─ public/
│  ├─ index.html        # the whole frontend (all roles, all views)
│  └─ logo.png          # ECE logo
├─ api/
│  ├─ _google.js        # shared auth + Sheets/Calendar helpers
│  ├─ login.js          # POST  validate against Users tab
│  ├─ staff.js          # GET   staff + live status
│  ├─ status.js         # POST  update aux status
│  ├─ bookings.js       # GET   all bookings
│  ├─ book.js           # POST  create booking (+ Meet link if online)
│  ├─ booking-update.js # POST  confirm / assign / complete
│  └─ calendar.js       # GET   synced Google Calendar events
├─ vercel.json
├─ package.json
├─ .env.example
└─ .gitignore
```
