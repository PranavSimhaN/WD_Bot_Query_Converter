#!/bin/bash
#
# WD Project Setup Script - Sets up and starts all services
# 
# This script handles the complete setup and startup of the WD Project:
#   1. Checks prerequisites (Docker, Python, Node.js)
#   2. Starts Docker containers (Neo4j + Backend)
#   3. Waits for services to be ready
#   4. Ingests data into Neo4j
#   5. Starts the frontend development server
#
# Usage: ./setup.sh [options]
# Options:
#   --skip-data    Skip data ingestion
#   --skip-frontend Skip frontend startup
#   --timeout N    Neo4j timeout in seconds (default: 120)
#

set -e

# Parse arguments
SKIP_DATA=false
SKIP_FRONTEND=false
NEO4J_TIMEOUT=120

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-data) SKIP_DATA=true; shift ;;
        --skip-frontend) SKIP_FRONTEND=true; shift ;;
        --timeout) NEO4J_TIMEOUT="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Output functions
step()    { echo -e "\n${CYAN}[STEP]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; }
info()    { echo -e "[INFO] $1"; }

# Cleanup function for graceful exit
cleanup() {
    if [ $? -ne 0 ]; then
        echo -e "\n${RED}Setup failed. Check the error messages above.${NC}"
    fi
}
trap cleanup EXIT

# Banner
echo -e "${MAGENTA}"
cat << 'EOF'

╔═══════════════════════════════════════════════════════════════╗
║             WD Project - Setup & Launch Script                ║
║                    Knowledge Graph + LLM                      ║
╚═══════════════════════════════════════════════════════════════╝

EOF
echo -e "${NC}"

# =============================================================================
# STEP 1: Check Prerequisites
# =============================================================================
step "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    error "Docker is not installed."
    info "Please install Docker from: https://docs.docker.com/get-docker/"
    exit 1
fi
success "Docker installed: $(docker --version)"

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    error "Docker daemon is not running."
    info "Please start Docker and try again."
    exit 1
fi
success "Docker daemon is running"

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    success "Docker Compose installed: $(docker-compose --version)"
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    success "Docker Compose (plugin) installed: $(docker compose version)"
    COMPOSE_CMD="docker compose"
else
    error "Docker Compose is not installed."
    info "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    error "Python is not installed."
    info "Please install Python 3.8+ from: https://www.python.org/downloads/"
    exit 1
fi
PYTHON_CMD=$(command -v python3 || command -v python)
success "Python installed: $($PYTHON_CMD --version)"

# Check pip
if ! $PYTHON_CMD -m pip --version &> /dev/null; then
    error "pip is not installed."
    info "Please install pip: https://pip.pypa.io/en/stable/installation/"
    exit 1
fi
success "pip installed: $($PYTHON_CMD -m pip --version | head -n1)"

# Check Node.js
if ! command -v node &> /dev/null; then
    error "Node.js is not installed."
    info "Please install Node.js 14+ from: https://nodejs.org/"
    exit 1
fi
success "Node.js installed: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    error "npm is not installed."
    exit 1
fi
success "npm installed: v$(npm --version)"

# =============================================================================
# STEP 2: Stop Existing Containers
# =============================================================================
step "Stopping any existing containers..."

$COMPOSE_CMD down 2>/dev/null || true
success "Existing containers stopped"

# =============================================================================
# STEP 3: Start Docker Containers
# =============================================================================
step "Starting Docker containers (Neo4j + Backend)..."

if ! $COMPOSE_CMD up -d; then
    error "Failed to start Docker containers."
    info "Check docker-compose.yml and try: $COMPOSE_CMD logs"
    exit 1
fi
success "Docker containers started"

# =============================================================================
# STEP 4: Wait for Neo4j to be Ready
# =============================================================================
step "Waiting for Neo4j to initialize (timeout: ${NEO4J_TIMEOUT}s)..."

start_time=$(date +%s)
neo4j_ready=false

while [ "$neo4j_ready" = false ]; do
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    
    if [ $elapsed -gt $NEO4J_TIMEOUT ]; then
        error "Neo4j failed to start within ${NEO4J_TIMEOUT} seconds."
        info "Troubleshooting steps:"
        info "  1. Check logs: $COMPOSE_CMD logs neo4j"
        info "  2. Ensure port 7687 is not in use"
        info "  3. Try: $COMPOSE_CMD down -v && $COMPOSE_CMD up -d neo4j"
        exit 1
    fi
    
    # Try to connect to Neo4j port
    if nc -z localhost 7687 2>/dev/null || (echo > /dev/tcp/localhost/7687) 2>/dev/null; then
        sleep 3  # Give Neo4j a bit more time to fully initialize
        neo4j_ready=true
        success "Neo4j is ready! (took ${elapsed}s)"
    else
        echo -n "." 
        sleep 3
    fi
done

# =============================================================================
# STEP 5: Wait for Backend to be Ready
# =============================================================================
step "Waiting for Backend to be ready..."

backend_ready=false
for i in {1..20}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        backend_ready=true
        success "Backend is ready!"
        break
    elif nc -z localhost 3001 2>/dev/null || (echo > /dev/tcp/localhost/3001) 2>/dev/null; then
        backend_ready=true
        success "Backend is ready (port 3001 responding)!"
        break
    fi
    echo -n "."
    sleep 2
done

if [ "$backend_ready" = false ]; then
    warning "Backend may not be fully ready, but continuing..."
    info "Check backend logs: $COMPOSE_CMD logs backend"
fi

# =============================================================================
# STEP 6: Install Python Dependencies & Ingest Data
# =============================================================================
if [ "$SKIP_DATA" = false ]; then
    step "Installing Python dependencies..."
    
    $PYTHON_CMD -m pip install neo4j -q 2>/dev/null || warning "Could not install neo4j Python driver"
    success "Python neo4j driver installed"
    
    step "Ingesting data into Neo4j..."
    info "This may take a minute for large datasets..."
    
    cd "$SCRIPT_DIR"
    if $PYTHON_CMD ingest.py; then
        success "Data ingestion completed!"
    else
        warning "Data ingestion may have failed."
        info "You can retry manually: $PYTHON_CMD ingest.py"
    fi
else
    warning "Skipping data ingestion (--skip-data flag)"
fi

# =============================================================================
# STEP 7: Install Frontend Dependencies
# =============================================================================
step "Setting up Frontend..."

cd "$SCRIPT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    info "Installing frontend dependencies (first run - this may take a few minutes)..."
    
    if ! npm install; then
        error "Failed to install frontend dependencies."
        info "Try running manually: cd frontend && npm install"
        exit 1
    fi
    success "Frontend dependencies installed"
else
    success "Frontend dependencies already installed"
fi

# =============================================================================
# STEP 8: Start Frontend
# =============================================================================
if [ "$SKIP_FRONTEND" = false ]; then
    step "Starting Frontend development server..."
    
    cd "$SCRIPT_DIR/frontend"
    
    # Start in background or new terminal based on OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - open in new Terminal window
        osascript -e "tell app \"Terminal\" to do script \"cd '$SCRIPT_DIR/frontend' && npm start\""
        success "Frontend started in new Terminal window"
    elif command -v gnome-terminal &> /dev/null; then
        # Linux with GNOME
        gnome-terminal -- bash -c "cd '$SCRIPT_DIR/frontend' && npm start; exec bash"
        success "Frontend started in new terminal window"
    elif command -v xterm &> /dev/null; then
        # Linux with xterm
        xterm -e "cd '$SCRIPT_DIR/frontend' && npm start" &
        success "Frontend started in new xterm window"
    else
        # Fallback - run in background
        npm start &
        success "Frontend started in background"
    fi
else
    warning "Skipping frontend startup (--skip-frontend flag)"
fi

# =============================================================================
# FINAL: Summary
# =============================================================================
cd "$SCRIPT_DIR"

echo -e "${GREEN}"
cat << 'EOF'

╔═══════════════════════════════════════════════════════════════╗
║                    SETUP COMPLETE!                            ║
╚═══════════════════════════════════════════════════════════════╝

EOF
echo -e "${NC}"

echo -e "${CYAN}Services Running:${NC}"
echo "  • Neo4j Browser:  http://localhost:7474"
echo "  • Backend API:    http://localhost:3001"
echo "  • Frontend App:   http://localhost:3000"

echo -e "\n${CYAN}Useful Commands:${NC}"
echo -e "  • View logs:      $COMPOSE_CMD logs -f"
echo -e "  • Stop all:       $COMPOSE_CMD down"
echo -e "  • Restart:        $COMPOSE_CMD restart"
echo -e "  • Re-ingest data: $PYTHON_CMD ingest.py"

echo -e "\n${YELLOW}Opening app in browser...${NC}"
sleep 3

# Open browser based on OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v sensible-browser &> /dev/null; then
    sensible-browser http://localhost:3000
fi
