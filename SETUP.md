# ECE Clinic Portal — Setup Guide

A consultation queue + online consultation portal. Frontend is a single static
page (`public/index.html`). Backend is Vercel serverless functions that read and
write a **Google Sheet** and create **Google Meet** links via **Google Calendar**.
The official consultation form is your **Zoho Creator "Clinic Visits" form**,
embedded in the nurse/doctor view.

Authentication to Google uses **OAuth2 with a refresh token** from the clinic
Google account — **no Workspace admin or domain-wide delegation required.**

The app runs immediately in **demo mode** (built-in mock data, no backend). Wiring
up the backend is what makes it real and persistent.

---

## 0. What you'll end up with

- **Login** for four roles: nurse, doctor, admin, employee.
- **Staff portal** (nurse/doctor/admin): aux status selector (Available, Not
  Available, Consultation Ongoing, Break, Lunch), booking queue, a Google
  Calendar view, and the embedded Zoho Clinic Visits form.
- **Employee view**: only available staff + a booking request form (with required
  ID number). If no onsite staff is available, it defaults to an online
  (Google Meet) consultation.
- **Public booking page** (no login) for the same booking request.
- **Online consultations** get an auto-generated Google Meet link.

---

## 1. The Google Sheet (your only datastore)

Create ONE Google Sheet **using the clinic Google account** (the same account you
will sign in with for OAuth in step 3).

> **Two ways to build the tabs/headers:**
> **(A) Automatic (recommended)** — after the backend is deployed (steps 2–6),
> open the new blank Sheet, then visit `/api/setup` once (see
> **§9 One-time auto-setup** below). It creates every tab and header for you.
> You then only add your Users/Staff rows.
> **(B) Manual** — create the tabs and type the header rows yourself, as listed
> below. Either way the headers must end up exactly as shown.

Add these tabs with these exact header rows in row 1.

**Tab `Users`** (login accounts)
```
email | password | name | role | id
```
- `role` is one of: `nurse`, `doctor`, `admin`, `employee`
- `id` should match the `id` in the `Staff` tab for clinical staff
- ⚠️ Passwords are plain text in `api/login.js`. Hash them before going live (§8).

**Tab `Staff`** (who appears in the portal + their live status)
```
id | name | role | email | status | site | building | lastIdleAt
```
- `status`: `available`, `notavailable`, `consultation`, `break`, `lunch`
- `site`: `Manila`, `Dumaguete`, or `Honduras`
- `building`: `Noel`, `Macias`, `Consuelo`, `Robinsons Summit`, or `WFH`
- `lastIdleAt`: leave blank; the app stamps it when staff go Available (used for Longest-Idle routing)
- Only `nurse` and `doctor` rows show in the employee "Available now" list.

**Tab `Bookings`**
```
id | trackingId | employee | zohoEmail | reason | mode | site | building | date | status | assignedTo | meet | eventId | createdAt | acceptedAt | consultEndAt
```
- Leave empty except headers; the app fills it.
- `trackingId` is auto-generated (e.g. `TRK-4528`) and shown to the requester.
- `zohoEmail` replaces the old ID-number field — the employee's ECE Zoho email.
- `createdAt` / `acceptedAt` / `consultEndAt` are timestamps the app uses to compute
  waiting time and total handling time in the Reports view.

**Tab `Settings`** (optional — queue routing). Two columns:
```
key | value
```
Add one row: `routing` | `longest_idle`  (the app can change it to `site_building`
from the Settings page). If you skip this tab, it defaults to `longest_idle`.

> Consultation records live in **Zoho** (the Clinic Visits form), so no consult
> tab is needed here.

Copy the **Sheet ID** — the long string between `/d/` and `/edit` in the URL.

---

## 2. Create an OAuth client (Google Cloud Console)

Sign in to <https://console.cloud.google.com> **as the clinic Google account**.

1. Create/select a project (top bar → New Project → name `ece-clinic`).
2. **Enable APIs** — search and Enable: **Google Sheets API** and **Google
   Calendar API**.
3. **OAuth consent screen** (APIs & Services → OAuth consent screen):
   - User type **Internal** if available (Workspace). Otherwise **External** and
     add the clinic account under **Test users**.
   - App name `ECE Clinic`, support email = yours. Save through the steps.
4. **Credentials → + Create Credentials → OAuth client ID**:
   - Application type: **Web application**, name `ece-clinic`
   - **Authorized redirect URIs → Add URI**:
     ```
     https://developers.google.com/oauthplayground
     ```
   - Create. Copy the **Client ID** and **Client secret**.

---

## 3. Get the refresh token (browser only — OAuth Playground)

No terminal needed.

1. Open <https://developers.google.com/oauthplayground>.
2. **⚙️ gear (top right)** → check **"Use your own OAuth credentials"** → paste
   your Client ID and Client secret.
3. In the left **"Input your own scopes"** box, paste (space-separated):
   ```
   https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar.events
   ```
4. **Authorize APIs** → sign in as the **clinic account** → approve.
   (If "unverified app" appears: Advanced → Go to ECE Clinic — it's your own app.)
5. Back in the Playground, click **Exchange authorization code for tokens**.
6. Copy the **`refresh_token`** value — that's `GOOGLE_REFRESH_TOKEN`.

> If `refresh_token` is empty: revoke the app at
> <https://myaccount.google.com/permissions> and redo 4–6. Google only returns it
> on first authorization unless access is revoked.

> Alternative (if you prefer a script): `get-refresh-token.js` is included; run
> `npm install googleapis` then `node get-refresh-token.js`. The Playground route
> above needs no terminal.

---

## 4. Put the code on GitHub (browser upload)

1. github.com → **+ → New repository** → name `ece-clinic` → Create empty
   (no README/gitignore).
2. On the repo page, click **uploading an existing file**.
3. Drag in the **contents** of the `ece-clinic` folder (the `public/` and `api/`
   folders, `vercel.json`, `package.json`, etc.) — not the outer folder itself.
4. **Commit changes.**

`.gitignore` excludes `node_modules`, `.env`, and any credential file. Never
commit real secrets.

---

## 5. Deploy on Vercel

1. <https://vercel.com> → **Add New → Project** → Continue with GitHub → import
   `ece-clinic`.
2. Framework preset **Other**; leave build command and output dir empty.
3. Add **Environment Variables** (from `.env.example`):
   - `SHEET_ID`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REFRESH_TOKEN`
   - `CALENDAR_ID` (optional; blank = primary calendar)
4. **Deploy.** If you add env vars after the first deploy, go to **Deployments →
   ⋯ → Redeploy** so they take effect.

---

## 6. Point the frontend at your API

In `public/index.html`, find near the top of the main script:
```js
const API_BASE = "";  // demo mode
```
Set it to your deployment:
```js
const API_BASE = "https://your-app.vercel.app/api";
```
Edit it directly on GitHub (pencil icon) → Commit. Vercel redeploys automatically.
The app now uses the Sheet and creates Meet links instead of mock data.

---

## 7. The Zoho "Clinic Visits" form

The nurse/doctor view embeds your Zoho form. In `public/index.html`:
```js
const ZOHO_FORM_URL = "https://creatorapp.zoho.com/ececonsultinggroup/ece-time-tracker/#Clinic_Visits";
```
This is the private in-app link — nurses/doctors are logged into Zoho, so it works
for them. If Zoho blocks the iframe, the portal automatically shows an
**"Open in new tab"** button. (To embed inline without a Zoho login, generate a
published permalink and paste it here instead.)

---

## 8. Security hardening before real use

- **Hash passwords** — replace the plain comparison in `api/login.js` with bcrypt;
  store hashes in the `Users` tab.
- **Add sessions/tokens** — issue a signed token from `api/login.js` and verify it
  in the other endpoints.
- **Restrict CORS** — in `_google.js`, change `Access-Control-Allow-Origin` from
  `*` to your Vercel domain.
- **Rate-limit** the public `book` endpoint.
- **Protect the refresh token** — it grants access to the clinic account's Sheets
  and Calendar. Keep it only in Vercel env vars; never in the repo. Revoke at
  <https://myaccount.google.com/permissions> if ever exposed.

---

## 9. One-time auto-setup (build tabs & headers automatically)

Instead of creating tabs and typing headers by hand, let the backend do it.

1. Make sure the backend is deployed and the OAuth env vars are set (steps 2–6),
   and that your blank Sheet is owned by / shared with the OAuth account.
2. In Vercel → **Settings → Environment Variables**, add a secret:
   - `SETUP_KEY` = any random string you choose, e.g. `ece-setup-9271`.
   Redeploy (Deployments → ⋯ → Redeploy) so the new var takes effect.
3. In your browser, visit:
   ```
   https://YOUR-APP.vercel.app/api/setup?key=YOUR_SETUP_KEY
   ```
   (use the same value you set for `SETUP_KEY`).
4. You'll get a JSON response listing the tabs created and headers written:
   `Users`, `Staff`, `Bookings`, `Settings`. Open the Sheet to confirm.
5. Add your data rows: at least one row in **Users** (to log in) and the matching
   clinical staff in **Staff** (with `site` and `building` filled in).
6. **Remove or rotate `SETUP_KEY` afterward** so the endpoint can't be re-run by
   anyone. (Re-running only rewrites the header rows — it never deletes your data
   rows — but it's good hygiene to disable it once setup is done.)

This is safe to run on an existing Sheet too: it adds any missing tabs and
repairs the row-1 headers to the exact expected names/order, leaving your data
rows untouched.

---

## Local development

```bash
npm install
npm i -g vercel
vercel dev
```
Put the same env vars in a local `.env` (gitignored) for `vercel dev`.

---

## File map

```
ece-clinic/
├─ public/
│  ├─ index.html        # the whole frontend (all roles, all views)
│  └─ logo.png          # ECE logo
├─ api/
│  ├─ _google.js        # OAuth2 auth + Sheets/Calendar helpers
│  ├─ login.js          # POST  validate against Users tab
│  ├─ staff.js          # GET   staff + live status
│  ├─ status.js         # POST  update aux status
│  ├─ bookings.js       # GET   all bookings
│  ├─ book.js           # POST  create booking (+ Meet link if online)
│  ├─ booking-update.js # POST  confirm / assign / complete
│  ├─ calendar.js       # GET   synced Google Calendar events
│  ├─ settings.js       # GET/POST  queue routing setting
│  ├─ staff-manage.js   # POST  admin add/edit/remove staff (Users+Staff)
│  ├─ change-password.js # POST  user changes own password (verifies current)
│  └─ setup.js          # GET   one-time: create tabs + headers (needs SETUP_KEY)
├─ get-refresh-token.js # optional one-time token helper (terminal)
├─ vercel.json
├─ package.json
├─ .env.example
└─ .gitignore
```
