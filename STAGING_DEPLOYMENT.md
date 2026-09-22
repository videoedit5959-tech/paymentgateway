# PaySync MFS Gateway — Staging Deployment Guide

**Document Version:** 1.0.0  
**Phase:** Phase 7 — Deployment Preparation & Production Readiness  
**Last Updated:** September 22, 2026  

---

## 1. Prerequisites & Staging Infrastructure Requirements

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **Operating System** | Ubuntu 22.04 LTS / Debian 12 | Ubuntu 24.04 LTS |
| **CPU / vCPU** | 2 vCPUs | 4 vCPUs |
| **RAM** | 4 GB | 8 GB |
| **Storage** | 30 GB SSD | 50 GB NVMe |
| **Node.js** | Node.js v20.x LTS | Node.js v20.18+ LTS |
| **Package Manager** | `npm` v10.x | `npm` v10.x |
| **Database** | MongoDB v6.0+ (Dedicated Staging DB) | MongoDB Atlas Staging Cluster |
| **Reverse Proxy** | Nginx 1.18+ | Nginx 1.24+ |

---

## 2. Step-by-Step Staging Deployment Instructions

### Step 1: Server Initialization & Node.js Setup
Log into the staging instance and install Node.js 20 LTS:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx git
node -v # Must output v20.x.x
npm -v  # Must output v10.x.x
```

### Step 2: Clone Codebase & Install Dependencies
```bash
cd /var/www
sudo git clone https://github.com/paysync/paysync-gateway.git staging-paysync
cd staging-paysync
npm ci
```

### Step 3: Configure Staging Environment Variables
Copy `.env.staging.example` to `.env`:
```bash
cp .env.staging.example .env
nano .env
```
Ensure the following variables are correctly configured for Staging:
```env
NODE_ENV=staging
PORT=3000
MONGODB_URI=mongodb+srv://staging_user:<PASSWORD>@staging-cluster.mongodb.net/paysync_staging?retryWrites=true&w=majority
JWT_ACCESS_SECRET=<STAGING_64_CHAR_HEX_SECRET>
JWT_REFRESH_SECRET=<STAGING_64_CHAR_HEX_SECRET>
ENCRYPTION_KEY=<STAGING_32_BYTES_HEX_SECRET>
WEBHOOK_SIGNING_SECRET=<STAGING_64_CHAR_HEX_SECRET>
DEVICE_AUTH_SECRET=<STAGING_64_CHAR_HEX_SECRET>
APP_URL=https://staging.paysync.io
API_URL=https://staging.paysync.io/api
CHECKOUT_URL=https://staging.paysync.io/checkout
CORS_ALLOWED_ORIGINS=https://staging.paysync.io
STRICT_PRODUCTION_MODE=true
```

### Step 4: Execute Production Build
Run the project's actual build script:
```bash
npm run build
```
Verify build output artifacts:
- Client SPA static bundle generated in `dist/`
- Express server CJS bundle generated in `dist/server.cjs`

### Step 5: Configure Process Manager (PM2 / Systemd)
Create PM2 ecosystem configuration `ecosystem.staging.config.cjs`:
```javascript
module.exports = {
  apps: [
    {
      name: 'paysync-staging',
      script: 'dist/server.cjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'staging',
        PORT: 3000,
      },
    },
  ],
};
```
Start server process:
```bash
sudo npm install -g pm2
pm2 start ecosystem.staging.config.cjs
pm2 save
pm2 startup
```

### Step 6: Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/staging.paysync.io`:
```nginx
server {
    server_name staging.paysync.io;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable site and test configuration:
```bash
sudo ln -s /etc/nginx/sites-available/staging.paysync.io /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Enable SSL via Let's Encrypt Certbot
```bash
sudo certbot --nginx -d staging.paysync.io
```

### Step 8: Post-Deployment Verification & Health Checks
Run health probe checks:
```bash
curl -i https://staging.paysync.io/api/health
curl -i https://staging.paysync.io/api/health/ready
```
Both probes must return `HTTP 200 OK` with `"status": "READY"`.

---

## 3. Android Collector Staging Build Procedure
1. Update `app/build.gradle.kts` in Android Collector repository:
   ```kotlin
   buildTypes {
       named("staging") {
           buildConfigField("String", "API_BASE_URL", "\"https://staging.paysync.io/api\"")
           applicationIdSuffix = ".staging"
           versionNameSuffix = "-staging"
       }
   }
   ```
2. Build Staging APK:
   ```bash
   ./gradlew assembleStaging
   ```
3. Calculate SHA-256 Checksum:
   ```bash
   sha256sum app/build/outputs/apk/staging/app-staging.apk
   ```
4. Upload Staging APK to Admin Release Center on `https://staging.paysync.io/admin`.
