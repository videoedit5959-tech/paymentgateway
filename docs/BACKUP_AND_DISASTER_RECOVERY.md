# PaySync MFS Gateway — Backup & Disaster Recovery Strategy

**Document Version:** 2.0.0  
**Phase:** Phase 7 — Staging & Production Readiness  
**Last Updated:** September 22, 2026  

---

## 1. Overview & Recovery Objectives

The PaySync MFS Gateway handles financial records, real-time SMS transaction matches, merchant credentials, and audit logs. A resilient backup and disaster recovery policy guarantees minimal Recovery Time Objective (RTO) and zero loss of completed transactions (Recovery Point Objective RPO < 1 minute).

### Target Operational Thresholds
- **Recovery Point Objective (RPO):** < 1 minute (achieved via MongoDB Atlas Continuous Point-In-Time Oplog Backups).
- **Recovery Time Objective (RTO):** < 30 minutes for full primary region cluster restoration.

---

## 2. MongoDB Backup Strategy

### A. Frequency & Retention Policy
1. **Continuous Point-In-Time Recovery (PITR):** Oplog snapshots captured continuously with 7-day granular point-in-time rewind capability.
2. **Daily Encrypted Snapshots:** Full `mongodump` execution at **02:00 UTC** daily, retained for **30 days**.
3. **Monthly Compliance Archives:** Retained for **12 months** in encrypted immutable cold storage (AWS S3 Glacier Vault / GCP Coldline).

### B. Offsite Encryption & Storage Protocol
Local backups must be encrypted client-side using GPG before offsite upload:
```bash
#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/paysync/mongo"
DB_NAME="${MONGODB_DB_NAME:-paysync_production}"
GPG_KEY_ID="ops-backup@paysync.io"
S3_BUCKET="s3://paysync-backups-secure-storage"

mkdir -p "${BACKUP_DIR}/${TIMESTAMP}"

# 1. Execute mongodump with oplog consistency
mongodump --uri="${MONGODB_URI}" --db="${DB_NAME}" --oplog --out="${BACKUP_DIR}/${TIMESTAMP}/dump"

# 2. Archive and compress
tar -czf "${BACKUP_DIR}/${TIMESTAMP}/db_backup_${TIMESTAMP}.tar.gz" -C "${BACKUP_DIR}/${TIMESTAMP}" dump

# 3. Client-side GPG asymmetric encryption
gpg --encrypt --recipient "${GPG_KEY_ID}" --trust-model always "${BACKUP_DIR}/${TIMESTAMP}/db_backup_${TIMESTAMP}.tar.gz"

# 4. Upload to immutable S3 Glacier Vault
aws s3 cp "${BACKUP_DIR}/${TIMESTAMP}/db_backup_${TIMESTAMP}.tar.gz.gpg" "${S3_BUCKET}/daily/${TIMESTAMP}.tar.gz.gpg"

# 5. Clean up local unencrypted temp files
rm -rf "${BACKUP_DIR}/${TIMESTAMP}"
```

---

## 3. Step-by-Step Restoration Procedure

In the event of database failure or disaster recovery:

### Step 1: Enable Application Maintenance Mode
Block new payment writes during restoration:
```bash
export MAINTENANCE_MODE=true
```

### Step 2: Download & Decrypt Backup Snapshot
```bash
mkdir -p /tmp/restore
aws s3 cp s3://paysync-backups-secure-storage/daily/20260922_020000.tar.gz.gpg /tmp/restore/
gpg --decrypt /tmp/restore/20260922_020000.tar.gz.gpg > /tmp/restore/backup.tar.gz
tar -xzf /tmp/restore/backup.tar.gz -C /tmp/restore/
```

### Step 3: Execute `mongorestore`
```bash
mongorestore --uri="${MONGODB_URI}" --db="${DB_NAME}" --drop --oplogReplay /tmp/restore/dump/${DB_NAME}
```

### Step 4: Verify Database Readiness Probe
```bash
curl -i https://paysync.io/api/health/ready
```
Ensure probe returns `HTTP 200 OK` with `"status": "READY"`. Reset `MAINTENANCE_MODE=false`.

---

## 4. Environment Secret & Android APK Backup Strategy

### A. Environment Secret Backup
- Environment configuration (`.env.production`) must be stored in a secured Secret Manager (e.g., AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault) with automated versioning.
- Never commit secrets to Git repositories.

### B. Android APK Release Backup
- Published Android Collector binaries (`.apk`) are stored in `/uploads/releases` or S3 storage.
- Admin Release Center metadata maintains SHA-256 signatures, version codes, and release notes in MongoDB (`androidreleases` collection).
- If a new APK build encounters device issues, the Super Admin can instantly roll back the `isLatest` release flag via `/api/android/releases/:id/set-latest`.
