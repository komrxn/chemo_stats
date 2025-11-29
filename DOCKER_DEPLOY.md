# Docker Deployment Guide

## Quick Start

### 1. Build and Run
```bash
cd kkh-analysis
docker-compose up -d --build
```

### 2. Access
- **Frontend**: http://localhost (port 80)
- **Backend API**: http://localhost:8000

### 3. Stop
```bash
docker-compose down
```

---

## Production Deployment

### On VPS/Server

1. **Clone repo on server**:
```bash
git clone <your-repo> /opt/kkh-analysis
cd /opt/kkh-analysis
```

2. **Build and run**:
```bash
docker-compose up -d --build
```

3. **Check logs**:
```bash
docker-compose logs -f
```

### With Custom Domain + SSL (Nginx Proxy)

1. **Install Certbot** on host:
```bash
apt install certbot
certbot certonly --standalone -d your-domain.com
```

2. **Create `nginx-proxy.conf`**:
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

3. **Update `docker-compose.yml`** - uncomment nginx-proxy section and mount SSL certs.

---

## Commands

| Command | Description |
|---------|-------------|
| `docker-compose up -d` | Start in background |
| `docker-compose down` | Stop all |
| `docker-compose logs -f` | Follow logs |
| `docker-compose build --no-cache` | Rebuild from scratch |
| `docker-compose restart backend` | Restart only backend |

---

## Troubleshooting

### Check container status
```bash
docker-compose ps
```

### Enter container shell
```bash
docker exec -it kkh-backend /bin/bash
docker exec -it kkh-frontend /bin/sh
```

### View specific logs
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Port already in use
```bash
# Find what's using port 80
sudo lsof -i :80
# Kill it or change port in docker-compose.yml
```

