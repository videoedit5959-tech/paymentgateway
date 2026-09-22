# PaySync Production Deployment Guide

This guide details deploying PaySync on production cloud infrastructure (Ubuntu 22.04 LTS / 24.04 LTS, Docker Compose, or Kubernetes).

---

## 1. System Requirements
- **Compute**: 2 vCPUs, 4GB RAM minimum (8GB RAM recommended for >50 req/sec)
- **OS**: Ubuntu 22.04 LTS x86_64
- **Database**: MongoDB 6.0+ (Replica Set enabled for multi-document ACID transactions)
- **Cache**: Redis 7.0+ (for rate limiting, pub/sub, and idempotency locks)
- **Reverse Proxy**: Nginx 1.24+ with TLS 1.3 certificate (Let's Encrypt / Cloudflare)

---

## 2. Docker Compose Deployment

PaySync includes a production-ready `docker-compose.yml` file.

### Environment Setup
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
nano .env
```

### Start Services
```bash
docker compose up -d --build
```

### Verify Status
```bash
docker compose ps
docker compose logs -f gateway
```

---

## 3. Native Linux (Systemd) Deployment

### 1. Build Production Bundle
```bash
npm ci
npm run build
```

### 2. Configure Systemd Service
Create `/etc/systemd/system/paysync.service`:
```ini
[Unit]
Description=PaySync MFS Gateway Production Daemon
After=network.target mongod.service redis.service

[Service]
Type=simple
User=paysync
WorkingDirectory=/opt/paysync
Environment=NODE_ENV=production
EnvironmentFile=/opt/paysync/.env
ExecStart=/usr/bin/node dist/server.cjs
Restart=always
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=paysync

[Install]
WantedBy=multi-user.target
```

### 3. Enable & Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable paysync
sudo systemctl start paysync
```

---

## 4. Nginx Reverse Proxy & SSL Setup

Create `/etc/nginx/sites-available/paysync.conf`:
```nginx
server {
    listen 80;
    server_name api.paysync.io gateway.paysync.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.paysync.io gateway.paysync.io;

    ssl_certificate /etc/letsencrypt/live/api.paysync.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.paysync.io/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

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
