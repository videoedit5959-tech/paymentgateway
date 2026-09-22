# PaySync MFS Gateway — Production Deployment Guide

**Document Version:** 1.0.0  
**Phase:** Phase 7 — Deployment Preparation & Production Readiness  
**Last Updated:** September 22, 2026  

---

## 1. Production Architecture Overview

The PaySync MFS Gateway production topology consists of an Nginx edge proxy terminating TLS 1.3, forwarding traffic to Node.js application containers, connected to a managed MongoDB replica set with automatic failover and Point-In-Time Recovery.

```text
[ Internet / Clients / Android Collectors ]
                    │
                    ▼ (HTTPS Port 443)
       ┌─────────────────────────┐
       │   Nginx Reverse Proxy   │ (TLS 1.3, Rate Limiting, Security Headers)
       └────────────┬────────────┘
                    │
                    ▼ (HTTP Port 3000)
       ┌─────────────────────────┐
       │ PaySync Node.js Process │ (Express + Vite CJS Bundle)
       └────────────┬────────────┘
                    │
                    ▼ (TLS Enclave)
       ┌─────────────────────────┐
       │  MongoDB Replica Set    │ (Primary + 2 Secondaries, Auto Failover)
       └─────────────────────────┘
```

---

## 2. Server & Environment Specifications

| Component | Minimum Specification | Recommended Production Specification |
| :--- | :--- | :--- |
| **Compute** | 2 vCPU, 4 GB RAM | 4 vCPU, 8 GB RAM (Load-Balanced Multi-Node) |
| **OS** | Ubuntu 22.04 LTS / 24.04 LTS | Ubuntu 24.04 LTS Server |
| **Database** | MongoDB Atlas M10 (Replica Set) | MongoDB Atlas M20+ (Replica Set with PITR) |
| **Storage** | 50 GB NVMe | 100 GB NVMe High IOPS |
| **Node Runtime** | Node.js v20.18+ LTS | Node.js v20.18+ LTS |
| **TLS Certificate** | RSA 2048-bit / ECC 256 | Certbot / Let's Encrypt / AWS ACM |

---

## 3. Step-by-Step Production Deployment Procedure

### Step 1: Server Provisioning & OS Hardening
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs nginx certbot python3-certbot-nginx ufw git
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Step 2: Code Checkout & Clean Dependency Installation
```bash
cd /var/www
sudo git clone https://github.com/paysync/paysync-gateway.git paysync-prod
cd paysync-prod
npm ci --only=production
```

### Step 3: Populate Production Environment Variables
Copy `.env.production.example` to `.env.production` and inject production secrets from AWS Secrets Manager / Vault:
```bash
cp .env.production.example .env
nano .env
```
Ensure all required production secrets are set (minimum 24-character random hex strings).

### Step 4: Execute Production Build
```bash
npm run build
```

### Step 5: Start PM2 Supervised Application Instance
Create `ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [
    {
      name: 'paysync-production',
      script: 'dist/server.cjs',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```
Start PM2 process:
```bash
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### Step 6: Configure Hardened Nginx Proxy
Create `/etc/nginx/sites-available/paysync.io`:
```nginx
server {
    listen 80;
    server_name paysync.io app.paysync.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name paysync.io app.paysync.io;

    ssl_certificate /etc/letsencrypt/live/paysync.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/paysync.io/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

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
    }
}
```
Enable site and test configuration:
```bash
sudo ln -s /etc/nginx/sites-available/paysync.io /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Post-Deployment Verification Checklist
1. **Liveness Check:** `curl -f https://paysync.io/api/health/live`
2. **Readiness Check:** `curl -f https://paysync.io/api/health/ready`
3. **OpenAPI Spec:** `curl -f https://paysync.io/api/v1/openapi.json`
4. **Android APK Check:** `curl -f https://paysync.io/api/android/releases/latest`
