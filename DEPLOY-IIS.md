# AlumniPad — Windows Server + IIS Deployment Guide

This guide deploys the AlumniPad backend (Node.js/Express) and frontend (React SPA) on a Windows Server machine running IIS, with PostgreSQL as the database.

---

## Prerequisites

Install the following on your Windows Server:

| Software | Purpose | Download |
|---|---|---|
| Node.js 20 LTS | Run backend | nodejs.org |
| PostgreSQL 16 | Database | postgresql.org |
| IIS (Windows feature) | Serve frontend + reverse proxy | Windows Features |
| iisnode | Run Node.js under IIS | github.com/Azure/iisnode/releases |
| URL Rewrite 2.1 | SPA routing + proxy rules | IIS Extensions |
| Git | Deploy code | git-scm.com |

### Enable IIS via PowerShell (run as Administrator)
```powershell
Install-WindowsFeature -name Web-Server, Web-Asp-Net45, Web-Scripting-Tools `
  -IncludeManagementTools
```

---

## Step 1 — Install iisnode and URL Rewrite

1. Download **iisnode** (x64 release) from GitHub and run the installer.
2. Download **URL Rewrite 2.1** from the IIS extensions site and install.
3. Restart IIS: `iisreset`

---

## Step 2 — Set Up PostgreSQL

```powershell
# After installing PostgreSQL, open psql as postgres user
psql -U postgres
```

```sql
CREATE USER alumnipad_user WITH PASSWORD 'StrongPassword123!';
CREATE DATABASE alumnipad OWNER alumnipad_user;
GRANT ALL PRIVILEGES ON DATABASE alumnipad TO alumnipad_user;
\q
```

---

## Step 3 — Deploy the Backend

### 3.1 — Copy files to server
```powershell
# Recommended location (IIS has access here)
New-Item -ItemType Directory -Path "C:\inetpub\alumnipad\backend" -Force
# Copy your backend folder contents to C:\inetpub\alumnipad\backend\
```

### 3.2 — Create `.env`
Create `C:\inetpub\alumnipad\backend\.env`:
```
DATABASE_URL=postgresql://alumnipad_user:StrongPassword123!@localhost:5432/alumnipad
JWT_SECRET=replace-with-64-random-chars
PORT=5000
FRONTEND_URL=https://yourdomain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=AlumniPad <your@gmail.com>
PAYSTACK_SECRET_KEY=sk_live_xxx
```

### 3.3 — Install dependencies and init DB
```powershell
cd C:\inetpub\alumnipad\backend
npm install --production
npm run db:init
```

### 3.4 — Create `web.config` for iisnode
Create `C:\inetpub\alumnipad\backend\web.config`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode" />
    </handlers>
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^server.js\/debug[\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}" />
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
          </conditions>
          <action type="Rewrite" url="server.js" />
        </rule>
      </rules>
    </rewrite>
    <security>
      <requestFiltering>
        <hiddenSegments>
          <add segment="node_modules" />
        </hiddenSegments>
      </requestFiltering>
    </security>
    <iisnode
      nodeProcessCommandLine="node.exe"
      watchedFiles="web.config;*.js"
      loggingEnabled="true"
      logDirectory="iisnode"
      debuggingEnabled="false"
    />
  </system.webServer>
</configuration>
```

### 3.5 — Create IIS Application for backend
```powershell
# Create application pool (no managed code)
New-WebAppPool -Name "AlumniPadBackend"
Set-ItemProperty IIS:\AppPools\AlumniPadBackend -Name managedRuntimeVersion -Value ""

# Create website or application
New-WebApplication -Name "api" -Site "Default Web Site" `
  -PhysicalPath "C:\inetpub\alumnipad\backend" `
  -ApplicationPool "AlumniPadBackend"
```

The backend will be accessible at `http://yourdomain.com/api/...`

---

## Step 4 — Build and Deploy the Frontend

### 4.1 — Build on your dev machine (or on the server if Node is installed)
```bash
cd alumnipad/frontend
# Set production env
echo "VITE_API_URL=https://yourdomain.com/api" > .env.production
echo "VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxx" >> .env.production

npm install
npm run build
```
This produces `alumnipad/frontend/dist/`.

### 4.2 — Copy `dist/` to server
```powershell
New-Item -ItemType Directory -Path "C:\inetpub\alumnipad\frontend" -Force
# Copy all contents of dist/ into C:\inetpub\alumnipad\frontend\
```

### 4.3 — Create `web.config` for SPA routing
Create `C:\inetpub\alumnipad\frontend\web.config`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React SPA" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
            <add input="{REQUEST_URI}" pattern="^/(api)" negate="true" />
          </conditions>
          <action type="Rewrite" url="/index.html" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".webmanifest" mimeType="application/manifest+json" />
    </staticContent>
    <httpProtocol>
      <customHeaders>
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="X-Frame-Options" value="SAMEORIGIN" />
        <add name="X-XSS-Protection" value="1; mode=block" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
```

### 4.4 — Create IIS Website for frontend
```powershell
New-WebAppPool -Name "AlumniPadFrontend"
Set-ItemProperty IIS:\AppPools\AlumniPadFrontend -Name managedRuntimeVersion -Value ""

# If serving on root domain:
New-Website -Name "AlumniPad" -Port 80 `
  -PhysicalPath "C:\inetpub\alumnipad\frontend" `
  -ApplicationPool "AlumniPadFrontend"
```

---

## Step 5 — Upload Folder Permissions

The backend writes files to `uploads/`. Grant IIS the right to write there:
```powershell
$uploadsPath = "C:\inetpub\alumnipad\backend\uploads"
New-Item -ItemType Directory -Path $uploadsPath -Force
New-Item -ItemType Directory -Path "$uploadsPath\avatars" -Force
New-Item -ItemType Directory -Path "$uploadsPath\photos" -Force
New-Item -ItemType Directory -Path "$uploadsPath\ads" -Force
New-Item -ItemType Directory -Path "$uploadsPath\campaigns" -Force

# Grant IIS_IUSRS write permission
$acl = Get-Acl $uploadsPath
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
  "IIS_IUSRS", "Modify", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($rule)
Set-Acl $uploadsPath $acl
```

---

## Step 6 — Reverse Proxy (Frontend → Backend API)

If both frontend and backend are on the same domain (recommended), add a reverse proxy rule so `/api` requests are forwarded to the Node.js process. This avoids CORS issues.

In IIS Manager → Default Web Site → URL Rewrite → Add Rule → Reverse Proxy:
- Pattern: `^api/(.*)`
- Rewrite URL: `http://localhost:5000/api/{R:1}`

Or add to frontend `web.config` inside `<rules>` **before** the SPA rule:
```xml
<rule name="API Proxy" stopProcessing="true">
  <match url="^api/(.*)" />
  <action type="Rewrite" url="http://localhost:5000/api/{R:1}" />
</rule>
```

> **Note:** The Application Request Routing (ARR) IIS extension must be installed for reverse proxy to work. Download from IIS extensions page.

---

## Step 7 — SSL / HTTPS

Use **Win-ACME** (free, Let's Encrypt for IIS) or a purchased certificate:
```powershell
# Download win-acme from github.com/win-acme/win-acme
# Run as Administrator:
.\wacs.exe --target iis --siteid 1 --installation iis --store certificatestore
```
This auto-renews the certificate and binds it to your IIS site.

---

## Step 8 — Configure Windows Firewall

```powershell
# Allow HTTP and HTTPS
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# PostgreSQL should NOT be open to the internet
# Keep port 5432 blocked externally (it binds to localhost by default)
```

---

## Step 9 — Keep Node.js Running (Process Manager)

iisnode manages the Node.js process lifecycle automatically via IIS — no PM2 needed. IIS will restart the process if it crashes.

To verify it's running:
```powershell
Get-Process node
```

---

## Step 10 — Verify Deployment

1. Visit `https://yourdomain.com` — landing page loads
2. Visit `https://yourdomain.com/api/public/stats` — returns JSON stats
3. Register a test account, approve it as admin, log in
4. Upload a photo, post an ad, post a job

---

## Folder Structure on Server

```
C:\inetpub\alumnipad\
├── backend\
│   ├── server.js
│   ├── web.config
│   ├── .env
│   ├── node_modules\
│   ├── uploads\
│   │   ├── avatars\
│   │   ├── photos\
│   │   ├── ads\
│   │   └── campaigns\
│   └── routes\
└── frontend\
    ├── index.html
    ├── web.config
    └── assets\
```

---

## Environment Update Checklist

When going live, change these from test to production values:
- [ ] `PAYSTACK_SECRET_KEY` → `sk_live_...`
- [ ] `VITE_PAYSTACK_PUBLIC_KEY` → `pk_live_...`
- [ ] `FRONTEND_URL` → your actual domain
- [ ] `VITE_API_URL` → `https://yourdomain.com/api`
- [ ] `JWT_SECRET` → 64+ random characters
- [ ] SMTP credentials for real email delivery

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| 500 on `/api/*` | iisnode not installed or web.config wrong | Check iisnode logs in `backend\iisnode\` |
| SPA routes 404 | URL Rewrite not installed | Install URL Rewrite 2.1 |
| File uploads fail | Folder permissions | Re-run Step 5 PowerShell commands |
| API CORS errors | Frontend URL mismatch | Set `FRONTEND_URL` in `.env` to exact origin |
| DB connection fail | Wrong connection string | Check `DATABASE_URL` and PostgreSQL service status |
| Paystack webhook fail | Server not reachable | Ensure HTTPS and firewall rules are correct |
