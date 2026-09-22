# PaySync MFS Gateway — Backup, Restore & Disaster Recovery Runbook

**Document Version:** 1.0.0  
**Phase:** Phase 7 — Deployment Preparation & Production Readiness  
**Last Updated:** September 22, 2026  

---

## 1. Backup Strategy & Policy

The PaySync MFS Gateway processes financial transactions, payment records, merchant wallet configurations, and security audit logs. Complete, encrypted continuous backups are required for production data safety.

### Backup Specifications
- **Frequency:** Full daily snapshot at **02:00 UTC** + continuous Point-In-Time Recovery (PITR) via MongoDB Oplog / MongoDB Atlas Continuous Backups.
- **Retention Period:**
  - Daily Snapshots: Retained for **30 days**.
  - Monthly Snapshots: Retained for **12 months** (compliance auditing).
  - Point-In-Time Recovery (PITR): **7 days** granular recovery.
- **Storage Target:** Offsite encrypted object storage (AWS S3 Glacier / GCP Cloud Storage Coldline) in a separate region from primary compute.
- **Encryption:** AES-256 server-side encryption at rest + client-side `gpg` asymmetric encryption prior to offsite upload.

---

## 2. Automated Backup Execution Script

Place the following backup script at `/opt/paysync/scripts/backup.sh` on the production database backup host:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/paysync/mongo"
DB_NAME="paysync_production"
MONGO_URI="${MONGODB_URI}"
S3_BUCKET="s3://paysync-production-backups-secure-region"
GPG_RECIPIENT="backup-ops@paysync.io"

echo "[$(date)] Starting PaySync MongoDB Backup for ${DB_NAME}..."

# Create local backup directory
mkdir -p "${BACKUP_DIR}/${TIMESTAMP}"

# Execute mongodump with oplog for point-in-time consistency
mongodump --uri="${MONGO_URI}" --db="${DB_NAME}" --oplog --out="${BACKUP_DIR}/${TIMESTAMP}/dump"

# Archive and compress
tar -czf "${BACKUP_DIR}/${TIMESTAMP}/paysync_db_${TIMESTAMP}.tar.gz" -C "${BACKUP_DIR}/${TIMESTAMP}" dump

# Encrypt archive using GPG key
gpg --encrypt --recipient "${GPG_RECIPIENT}" --trust-model always "${BACKUP_DIR}/${TIMESTAMP}/paysync_db_${TIMESTAMP}.tar.gz"

# Upload encrypted archive to offsite S3 object storage
aws s3 cp "${BACKUP_DIR}/${TIMESTAMP}/paysync_db_${TIMESTAMP}.tar.gz.gpg" "${S3_BUCKET}/daily/${TIMESTAMP}.tar.gz.gpg" --storage-class STANDARD_IA

# Clean up local backup folder after verification
rm -rf "${BACKUP_DIR}/${TIMESTAMP}"

echo "[$(date)] PaySync Backup ${TIMESTAMP} successfully completed and uploaded offsite."
```

---

## 3. Disaster Recovery & Restoration Runbook

In the event of database corruption, data center outage, or accidental loss, follow this step-by-step restoration procedure:

### Step 1: Isolate & Enable Maintenance Mode
Prevent incoming payment writes while restoration is underway:
```bash
# Set maintenance mode on application server
export MAINTENANCE_MODE=true
```

### Step 2: Retrieve Encrypted Backup Archive
Download the required snapshot from offsite storage:
```bash
aws s3 cp s3://paysync-production-backups-secure-region/daily/20260922_020000.tar.gz.gpg /tmp/restore/
```

### Step 3: Decrypt and Unpack
```bash
cd /tmp/restore
gpg --decrypt 20260922_020000.tar.gz.gpg > paysync_db_restore.tar.gz
tar -xzf paysync_db_restore.tar.gz
```

### Step 4: Execute `mongorestore`
Restore into target MongoDB cluster with `--drop` option (recreates collections and indexes):
```bash
mongorestore --uri="${MONGODB_URI}" --db="paysync_production" --drop --oplogReplay /tmp/restore/dump/paysync_production
```

### Step 5: Post-Restore Verification
Run database verification queries:
1. Verify record count in `payments`, `transactions`, `merchants`, and `devices`.
2. Verify that Mongoose indexes are rebuilt (`db.transactions.getIndexes()`).
3. Run readiness health check: `curl https://paysync.io/api/health/ready`.
4. Disable Maintenance Mode (`export MAINTENANCE_MODE=false`).

---

## 4. Periodic Backup Testing Policy

- **Monthly Fire-Drill:** Every 30 days, DevOps engineers must restore the latest production snapshot into a isolated **Staging Test Database** to verify backup integrity, decryption keys, and restore time objective (RTO < 30 minutes).
