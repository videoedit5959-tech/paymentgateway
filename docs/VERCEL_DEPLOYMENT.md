# PaySync MFS Gateway — Vercel Deployment Step-by-Step Guide

**Document Version:** 1.0.0  
**Phase:** Vercel Production Deployment  
**Date:** September 22, 2026  

---

## 1. Overview

This guide details the exact steps required to deploy the PaySync MFS Gateway to Vercel.

---

## 2. Prerequisites

1. **Vercel Account**: Team or individual account on Vercel.
2. **MongoDB Atlas Cluster**: Managed MongoDB instance (M10+ recommended for production).
3. **Domain Name**: Domain or subdomain (e.g., `paysync.io` or `staging.paysync.io`).
4. **Environment Variables Ready**: Cryptographic keys generated via `openssl rand -hex 32`.

---

## 3. Step 1 — MongoDB Atlas Configuration

1. Log into **MongoDB Atlas Console**.
2. Under **Network Access**, add IP address `0.0.0.0/0` (required for Vercel dynamic serverless IP ranges).
3. Under **Database Access**, create a database user with read/write access to the `paysync_production` database.
4. Copy the connection string:
   `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/paysync_production?retryWrites=true&w=majority`

---

## 4. Step 2 — Configure Vercel Project Environment Variables

In Vercel Project Settings -> **Environment Variables**, configure the following:

| Variable Name | Value / Format | Target Environments |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Production, Preview |
| `MONGODB_URI` | `mongodb+srv://.../paysync_production?...` | Production, Preview |
| `ALLOW_IN_MEMORY_FALLBACK` | `false` | Production, Preview |
| `STRICT_PRODUCTION_MODE` | `true` | Production, Preview |
| `JWT_ACCESS_SECRET` | 64-character random hex string | Production, Preview |
| `JWT_REFRESH_SECRET` | 64-character random hex string | Production, Preview |
| `ENCRYPTION_KEY` | 64-character random hex string (32 bytes) | Production, Preview |
| `WEBHOOK_SIGNING_SECRET` | 64-character random hex string | Production, Preview |
| `DEVICE_AUTH_SECRET` | 64-character random hex string | Production, Preview |
| `CRON_SECRET` | 64-character random hex string | Production, Preview |
| `APP_URL` | `https://your-domain.vercel.app` | Production, Preview |
| `API_URL` | `https://your-domain.vercel.app/api` | Production, Preview |
| `CHECKOUT_URL` | `https://your-domain.vercel.app/checkout` | Production, Preview |
| `CORS_ALLOWED_ORIGINS` | `https://your-domain.vercel.app` | Production, Preview |

---

## 5. Step 3 — Deploy via Vercel CLI or Git

### Option A: Deployment via Vercel CLI

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Link Project
vercel link

# 4. Deploy to Production
vercel --prod
```

### Option B: Deployment via GitHub / Git Integration

1. Push code repository to GitHub.
2. In Vercel Dashboard, click **Add New Project** -> Import GitHub Repository.
3. Framework Preset: **Vite** (or Other).
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Click **Deploy**.

---

## 6. Step 4 — Verify Vercel Cron Execution

1. Navigate to Vercel Dashboard -> Project -> **Settings** -> **Cron Jobs**.
2. Verify two active cron schedules:
   - `/api/cron/webhooks` (Every 1 minute)
   - `/api/cron/devices` (Every 1 minute)
3. Check execution logs to verify HTTP `200 OK` status responses.

---

## 7. Step 5 — Post-Deployment Verification Probes

Run the following verification commands against your Vercel deployment URL:

```bash
# 1. Liveness Probe
curl -i https://your-domain.vercel.app/api/health/live

# 2. Database & Readiness Probe
curl -i https://your-domain.vercel.app/api/health/ready

# 3. System Overview
curl -i https://your-domain.vercel.app/api/health
```

---

## 8. Step 6 — Android Collector Configuration

1. Open the Android SMS Collector app.
2. Update the Gateway Base URL to your Vercel API endpoint:
   `https://your-domain.vercel.app/api`
3. Scan merchant QR code to perform pairing.
4. Verify Android device heartbeats are received in PaySync Merchant Dashboard.
