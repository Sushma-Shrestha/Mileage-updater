# Mileage Tracker — Nuxt 4 + OneDrive Excel

Logs mileage entries (Name, Date, Miles) into **Table 1** of an Excel file
in personal OneDrive using SheetJS. Works with personal Microsoft accounts
(outlook.com / hotmail.com / live.com) — **no Microsoft 365 licence required**.

---

## How it works

| Step | Detail |
|---|---|
| **Auth** | MSAL.js redirect flow — no popups, works in all browsers |
| **Download** | `GET /me/drive/items/{id}/content` — raw `.xlsx` binary |
| **Edit** | SheetJS parses and edits the workbook in the browser |
| **Upload** | `PUT /me/drive/items/{id}/content` — replaces the file |
| **Other sheets** | `Dashboard` and any other sheets are preserved untouched |

---

## Setup

### 1 — Create an Azure App Registration (5 min)

1. Go to **[portal.azure.com](https://portal.azure.com)** and sign in with your personal Microsoft account.
2. Search **App registrations** → **New registration**
3. Fill in:
   - **Name**: Mileage Tracker (anything)
   - **Supported account types**: *Personal Microsoft accounts only*
   - **Redirect URI**: Platform = **Single-page application (SPA)**, URI = `http://localhost:3000`
4. Click **Register**. Copy:
   - **Application (client) ID** → `MSAL_CLIENT_ID`
5. Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated**
   - Add `Files.ReadWrite`
   - Add `User.Read`
6. Click **Grant admin consent** (optional for personal accounts — users consent on first login).

---

### 2 — Get your Excel file ID

Open **[Graph Explorer](https://developer.microsoft.com/graph/graph-explorer)** signed in with your personal account, then run:

```
GET https://graph.microsoft.com/v1.0/me/drive/root/children
```

Find your Excel file in the JSON response and copy its `id` field → `ONEDRIVE_FILE_ID`.

> The Excel file must have a sheet named exactly **`Table 1`** (and optionally `Dashboard`).

---

### 3 — Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
MSAL_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONEDRIVE_FILE_ID=ABC123DEF!456
```

---

### 4 — Install & run

```bash
npm install
npm run dev
```

Open **http://localhost:3000**, click **Sign in with Microsoft**, and start logging.

---

## Project structure (Nuxt 4 `app/` layout)

```
nuxt-mileage-app/
├── nuxt.config.ts
├── .env.example
└── app/
    ├── app.vue                        # Root — NuxtLayout + NuxtPage
    ├── assets/css/main.css            # Global tokens + button styles
    ├── plugins/
    │   └── msal.client.ts             # MSAL init + handleRedirectPromise
    ├── composables/
    │   ├── useAuth.ts                 # login / logout / getAccessToken
    │   └── useExcel.ts                # appendEntry / fetchEntries (SheetJS)
    ├── components/
    │   └── MicrosoftLogo.vue          # Microsoft coloured squares SVG
    ├── layouts/
    │   └── default.vue                # Top nav, user pill, sign-in button
    └── pages/
        ├── index.vue                  # Mileage form + recent entries
        └── history.vue                # Full table with sort + search
```

---

## Deploying

Add your production URL as an additional **Redirect URI** (SPA) in the Azure portal under **Authentication**.

```bash
npm run generate   # static output in .output/public/
# or
npm run build      # SSR build
```

Set `MSAL_CLIENT_ID` and `ONEDRIVE_FILE_ID` as environment variables on your host
(Vercel, Netlify, Azure Static Web Apps, etc.).
