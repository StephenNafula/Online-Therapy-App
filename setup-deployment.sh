#!/bin/bash

# Deployment Setup Script for Happiness Online Therapy App
# This script helps set up your deployment to MongoDB Compass, Vercel, and Render

set -e  # Exit on error

echo "================================================"
echo "🚀 Happiness App - Deployment Setup Guide"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# STEP 1: Check Prerequisites
# ============================================
echo -e "${BLUE}STEP 1: Checking Prerequisites${NC}"
echo "================================================"

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}❌ Git not found. Please install Git.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Git is installed${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}❌ Node.js not found. Please install Node.js.${NC}"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION} is installed${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}❌ npm not found. Please install npm.${NC}"
    exit 1
fi
NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm ${NPM_VERSION} is installed${NC}"

# Check MongoDB (optional for local dev)
if command -v mongosh &> /dev/null; then
    echo -e "${GREEN}✓ MongoDB is installed${NC}"
else
    echo -e "${YELLOW}⚠ MongoDB not found. You'll need to install it for local testing.${NC}"
fi

echo ""

# ============================================
# STEP 2: Setup Server Environment
# ============================================
echo -e "${BLUE}STEP 2: Setting up Server Environment${NC}"
echo "================================================"

if [ ! -f "server/.env" ]; then
    cp server/.env.example server/.env
    echo -e "${GREEN}✓ Created server/.env from template${NC}"
    echo -e "${YELLOW}📝 Please edit server/.env with your MongoDB URI${NC}"
else
    echo -e "${GREEN}✓ server/.env already exists${NC}"
fi

echo ""

# ============================================
# STEP 3: Setup Client Environment
# ============================================
echo -e "${BLUE}STEP 3: Setting up Client Environment${NC}"
echo "================================================"

if [ ! -f "client/.env.local" ]; then
    cat > client/.env.local << 'EOF'
VITE_API_URL=http://localhost:4000/api
VITE_SOCKET_URL=http://localhost:4000
EOF
    echo -e "${GREEN}✓ Created client/.env.local${NC}"
else
    echo -e "${GREEN}✓ client/.env.local already exists${NC}"
fi

if [ ! -f "client/.env.production" ]; then
    cat > client/.env.production << 'EOF'
# Update these with your Render backend URL after deployment
VITE_API_URL=https://your-render-backend.onrender.com/api
VITE_SOCKET_URL=https://your-render-backend.onrender.com
EOF
    echo -e "${GREEN}✓ Created client/.env.production${NC}"
    echo -e "${YELLOW}📝 You'll update this after deploying to Render${NC}"
else
    echo -e "${GREEN}✓ client/.env.production already exists${NC}"
fi

echo ""

# ============================================
# STEP 4: Install Dependencies
# ============================================
echo -e "${BLUE}STEP 4: Installing Dependencies${NC}"
echo "================================================"

echo "Installing server dependencies..."
cd server
npm install
cd ..
echo -e "${GREEN}✓ Server dependencies installed${NC}"

echo "Installing client dependencies..."
cd client
npm install
cd ..
echo -e "${GREEN}✓ Client dependencies installed${NC}"

echo ""

# ============================================
# STEP 5: Display Deployment Instructions
# ============================================
echo -e "${BLUE}STEP 5: Next Steps${NC}"
echo "================================================"
echo ""
echo -e "${GREEN}✅ Local setup is complete!${NC}"
echo ""
echo "📚 For detailed deployment instructions, see:"
echo "   • DEPLOYMENT_GUIDE.md (comprehensive guide)"
echo "   • DEPLOYMENT_CHECKLIST.md (quick checklist)"
echo ""
echo -e "${YELLOW}Quick Start:${NC}"
echo ""
echo "1️⃣  Start MongoDB (if using local):"
echo "   sudo systemctl start mongod"
echo ""
echo "2️⃣  Seed admin and therapist users:"
echo "   cd server"
echo "   node scripts/create_admin.js"
echo "   node scripts/create_therapist.js"
echo ""
echo "3️⃣  Start local development:"
echo "   # Terminal 1 - Backend"
echo "   cd server && npm start"
echo ""
echo "   # Terminal 2 - Frontend"
echo "   cd client && npm run dev"
echo ""
echo "4️⃣  Test locally at:"
echo "   Frontend: http://localhost:5173"
echo "   Backend: http://localhost:4000"
echo ""
echo -e "${YELLOW}Deployment Steps:${NC}"
echo ""
echo "1. MongoDB Atlas (Cloud Database)"
echo "   • Go to mongodb.com/cloud/atlas"
echo "   • Create free account and cluster"
echo "   • Update MONGODB_URI in server/.env"
echo ""
echo "2. Vercel (Frontend)"
echo "   • npm i -g vercel"
echo "   • cd client && vercel --prod"
echo "   • Add environment variables in dashboard"
echo ""
echo "3. Render (Backend)"
echo "   • Go to render.com"
echo "   • Connect GitHub repository"
echo "   • Add environment variables"
echo "   • Deploy"
echo ""
echo "4. Connect Everything"
echo "   • Update client/.env.production with Render URL"
echo "   • Update Render CORS_ORIGIN to Vercel URL"
echo "   • Redeploy both services"
echo ""
echo -e "${GREEN}Need help? Check DEPLOYMENT_GUIDE.md${NC}"
echo ""
