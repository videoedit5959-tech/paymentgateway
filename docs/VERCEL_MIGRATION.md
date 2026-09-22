# PaySync MFS Gateway — Vercel Serverless Migration Architecture

**Document Version:** 1.0.0  
**Phase:** Vercel Adaptation & Serverless Optimization  
**Date:** September 22, 2026  

---

## 1. Executive Summary

This document details the architectural adaptations implemented to enable the PaySync MFS Payment Gateway to run seamlessly on Vercel's serverless infrastructure without breaking existing local Node/Docker workflows or compromising security controls.

All five required serverless adaptations identified in the audit phase have been implemented cleanly:

1. **Serverless Express Entry Point (`api/index.ts` & `server/app.ts`)**: Separated Express application setup from server binding (`app.listen`).
2. **Vercel Configuration & Routing (`vercel.json`)**: Configured single-page app static rendering alongside serverless API rewrites.
3. **Vercel Cron Workers (`server/routes/cron.ts`)**: Replaced long-lived in-process `setInterval` loops with HTTP-triggered Vercel Cron endpoints protected by constant-time `CRON_SECRET` validation.
4. **Persistent APK Storage (MongoDB GridFS)**: Migrated Android APK artifact storage from local ephemeral filesystems (`public/downloads/apk`) to MongoDB GridFS with local disk fallback.
5. **Serverless Connection Caching (`server/db/connect.ts`)**: Implemented global Mongoose connection caching (`global.mongooseCache`) to prevent database pool exhaustion across warm function re-uses.

---

## 2. Technical Adaptation Details

### 2.1 Serverless App Isolation (`server/app.ts` & `api/index.ts`)

- **Problem**: `server.ts` previously started an Express app and immediately called `app.listen(3000)`. Serverless functions require exporting a function handler without blocking process execution.
- **Solution**:
  - Extracted route registrations, security headers, CORS policies, raw body parsers, and health probes into `server/app.ts` (`createApp()`).
  - Created `/api/index.ts` as the Vercel serverless function handler.
  - Updated `server.ts` to use `createApp()` and conditionally skip `app.listen()` when `process.env.VERCEL === '1'`.

### 2.2 Vercel Configuration & Rewrites (`vercel.json`)

- **Build Target**: Vite output in `dist`.
- **API Rewrites**: Maps `/api/(.*)` directly to serverless function `/api/index.ts`.
- **Frontend Rewrites**: Maps all non-API paths `/(.*)` to `index.html` for client-side React SPA routing.
- **Scheduled Cron**: Configured 1-minute execution intervals for `/api/cron/webhooks` and `/api/cron/devices`.

### 2.3 Background Workers & Cron Validation (`server/routes/cron.ts`)

- **Endpoints**:
  - `GET /api/cron/webhooks`: Triggers `WebhookService.processPendingRetries()`.
  - `GET /api/cron/devices`: Triggers `Repository.markStaleDevicesOffline()`.
- **Security Control**:
  - Validates `Authorization: Bearer <CRON_SECRET>` or `X-Cron-Secret` header using `crypto.timingSafeEqual`.
  - Rejects unauthorized invocations in production/staging when `CRON_SECRET` is defined.

### 2.4 MongoDB GridFS APK Storage (`AndroidReleaseService`)

- **Problem**: Vercel functions have an ephemeral, read-only root filesystem (except `/tmp`). Files written to disk during release publication are lost when container instances terminate.
- **Solution**:
  - Integrated `mongoose.mongo.GridFSBucket` under bucket name `apk_files`.
  - `AndroidReleaseService.uploadApkToGridFS()` stores uploaded/generated APK binaries directly in MongoDB Atlas.
  - `GET /api/android/releases/:id/download` attempts streaming directly from GridFS first before falling back to disk streams.

### 2.5 Mongoose Connection Caching (`server/db/connect.ts`)

- **Problem**: Ephemeral serverless function instances creating new Mongoose connections per request can quickly exhaust MongoDB connection pools.
- **Solution**:
  - Implemented `global.mongooseCache` to cache active connection instances and in-flight connection promises across serverless invocations.

---

## 3. Backwards Compatibility Verification

- **Local Development**: Running `npm run dev` or `node server.ts` continues to bind to `http://0.0.0.0:3000` and start in-process background loops.
- **Docker & Staging VPS**: `docker-compose.yml` and `docker-compose.staging.yml` remain 100% operational without modification.
- **Security Architecture**: HMAC signatures, JWT authorization, AES-256 encryption, rate limiting, and tenant isolation remain completely intact.
