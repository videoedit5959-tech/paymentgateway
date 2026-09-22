# PaySync MFS Gateway — Rollback Strategy & Emergency Recovery Plan

**Document Version:** 1.0.0  
**Phase:** Phase 7 — Deployment Preparation & Production Readiness  
**Last Updated:** September 22, 2026  

---

## 1. Rollback Directives & Safety Thresholds

A deployment rollback must be triggered immediately if any of the following critical thresholds are met following a release:
1. **Critical Failure in SMS Ingestion:** Error rate on `/api/v1/sms/ingest` > 2% over 5 minutes.
2. **Database Outage or Transaction Lock Failures:** MongoDB connection failures or duplicate key errors during payment completion.
3. **Android Collector Telemetry Drop:** > 50% of active collectors lose connection simultaneously.
4. **Fatal API Authentication Breakdown:** Invalid JWT signatures or API key validation failures across merchant API routes.

---

## 2. Step-by-Step Application Rollback Procedure

### Step 1: Revert PM2 / Docker Application Instance
If using PM2:
```bash
cd /var/www/paysync-prod
# Checkout previous git release tag
git checkout tags/v1.0.0
# Rebuild previous version
npm run build
# Reload PM2 cluster gracefully
pm2 reload ecosystem.config.cjs
```

If using Docker:
```bash
# Rollback container image tag to previous stable build
docker-compose -f docker-compose.yml pull paysync-gateway:v1.0.0
docker-compose -f docker-compose.yml up -d --no-deps paysync-app
```

### Step 2: Verify Rollback Health Probes
```bash
curl -f http://127.0.0.1:3000/api/health
curl -f http://127.0.0.1:3000/api/health/ready
```

### Step 3: Android APK Rollback Protocol
If a newly deployed Android Collector APK exhibits bugs or OS crashes:
1. In the Super Admin Release Center (`/admin`), update the **Latest Published Release** back to the previous stable release version (e.g. `v1.0.4`).
2. Android Collector devices automatically fetch `/api/android/releases/latest` on next heartbeat and display update notifications for the stable build.

---

## 3. Database Compatibility & Irreversible Operations

### Backward Compatibility Principle
- **No Destructive Field Deletions:** Database schemas must always maintain backward-compatible fields. New releases must not remove or rename existing fields in MongoDB collections without a phased 2-release migration grace window.
- **Idempotency Guarantees:** Transaction matching and webhook delivery records maintain atomic state locks (`status: 'COMPLETED'`). Rolling back application binary code will NOT alter or invalidate already processed transactions.

### Irreversible Operations
- **Database Collection Dropping:** Once `db.collection.drop()` or database truncation occurs, rollback is NOT possible via code revert; data must be restored from cold encrypted backups (`docs/BACKUP_AND_RESTORE.md`).
- **Secret Key Changes:** If `ENCRYPTION_KEY` or `JWT_ACCESS_SECRET` is modified in `.env`, all existing merchant encrypted tokens and active user JWTs will become invalid unless reverted immediately.
