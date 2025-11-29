#!/bin/bash
# VPS Deployment Script for KKH Analysis Platform
# Ubuntu 24.04 LTS

set -e  # Exit on error

echo "🚀 Starting deployment on VPS..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/kkh-analysis"
BACKEND_PORT=8000
FRONTEND_PORT=80

echo -e "${YELLOW}📦 Step 1: Installing dependencies...${NC}"

# Update system
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx git curl

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"

echo -e "${YELLOW}📥 Step 2: Cloning/Updating repository...${NC}"

# Clone or update repository
if [ -d "$PROJECT_DIR" ]; then
    echo "Updating existing repository..."
    cd $PROJECT_DIR
    git pull
else
    echo "Cloning repository..."
    sudo mkdir -p $PROJECT_DIR
    sudo chown $USER:$USER $PROJECT_DIR
    
    # You need to push to GitHub first, then use:
    # git clone https://github.com/YOUR_USERNAME/kkh-analysis.git $PROJECT_DIR
    
    echo -e "${YELLOW}⚠️  Manual step needed:${NC}"
    echo "1. Push code to GitHub"
    echo "2. Run: git clone https://github.com/YOUR_USERNAME/kkh-analysis.git $PROJECT_DIR"
    echo "3. Then run this script again"
    exit 1
fi

echo -e "${GREEN}✅ Repository ready${NC}"

echo -e "${YELLOW}🐍 Step 3: Setting up Backend...${NC}"

# Setup Python backend
cd $PROJECT_DIR/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

echo -e "${GREEN}✅ Backend setup complete${NC}"

echo -e "${YELLOW}⚛️  Step 4: Building Frontend...${NC}"

# Build frontend
cd $PROJECT_DIR/frontend

# Create .env.production
cat > .env.production << EOF
VITE_API_URL=http://$(curl -s ifconfig.me)
EOF

# Install and build
npm install
npm run build

echo -e "${GREEN}✅ Frontend built${NC}"

echo -e "${YELLOW}⚙️  Step 5: Creating systemd service for backend...${NC}"

# Create systemd service
sudo tee /etc/systemd/system/kkh-backend.service > /dev/null << EOF
[Unit]
Description=KKH Analysis Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/backend
Environment="PATH=$PROJECT_DIR/backend/venv/bin"
Environment="PORT=8000"
Environment="FRONTEND_URL=http://$(curl -s ifconfig.me)"
ExecStart=$PROJECT_DIR/backend/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start backend
sudo systemctl daemon-reload
sudo systemctl enable kkh-backend
sudo systemctl restart kkh-backend

echo -e "${GREEN}✅ Backend service started${NC}"

echo -e "${YELLOW}🌐 Step 6: Configuring Nginx...${NC}"

# Backup existing nginx config
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup || true

# Create nginx configuration
sudo tee /etc/nginx/sites-available/kkh-analysis > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    # Frontend - Static files
    location / {
        root /opt/kkh-analysis/frontend/dist;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # API docs
    location /docs {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/kkh-analysis /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
sudo nginx -t
sudo systemctl restart nginx

echo -e "${GREEN}✅ Nginx configured${NC}"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "📱 Frontend: http://$(curl -s ifconfig.me)"
echo -e "🔧 Backend:  http://$(curl -s ifconfig.me)/api"
echo -e "📚 API Docs: http://$(curl -s ifconfig.me)/docs"
echo ""
echo -e "${YELLOW}📊 Check status:${NC}"
echo "  Backend:  sudo systemctl status kkh-backend"
echo "  Nginx:    sudo systemctl status nginx"
echo ""
echo -e "${YELLOW}📝 View logs:${NC}"
echo "  Backend:  sudo journalctl -u kkh-backend -f"
echo "  Nginx:    sudo tail -f /var/log/nginx/access.log"
echo ""

