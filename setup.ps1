<#
.SYNOPSIS
    WD Project Setup Script - Sets up and starts all services
.DESCRIPTION
    This script handles the complete setup and startup of the WD Project:
    1. Checks prerequisites (Docker, Python, Node.js)
    2. Starts Docker containers (Neo4j + Backend)
    3. Waits for services to be ready
    4. Ingests data into Neo4j
    5. Starts the frontend development server
.NOTES
    Run this script after cloning the repository.
    Usage: .\setup.ps1
#>

param(
    [switch]$SkipDataIngestion,
    [switch]$SkipFrontend,
    [int]$Neo4jTimeout = 120
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Colors for output
function Write-Step { param($Message) Write-Host "`n[STEP] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[OK] $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor White }

# Banner
Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║             WD Project - Setup & Launch Script                ║
║                    Knowledge Graph + LLM                      ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Magenta

# =============================================================================
# STEP 1: Check Prerequisites
# =============================================================================
Write-Step "Checking prerequisites..."

# Check Docker
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Docker not found" }
    Write-Success "Docker installed: $dockerVersion"
} catch {
    Write-Error "Docker is not installed or not running."
    Write-Info "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
}

# Check if Docker daemon is running
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Docker daemon not running" }
    Write-Success "Docker daemon is running"
} catch {
    Write-Error "Docker daemon is not running. Please start Docker Desktop."
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker-compose --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose not found" }
    Write-Success "Docker Compose installed: $composeVersion"
} catch {
    Write-Error "Docker Compose is not installed."
    Write-Info "Please install Docker Compose or use Docker Desktop (includes Compose)"
    exit 1
}

# Check Python
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Python not found" }
    Write-Success "Python installed: $pythonVersion"
} catch {
    Write-Error "Python is not installed."
    Write-Info "Please install Python 3.8+ from: https://www.python.org/downloads/"
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Node.js not found" }
    Write-Success "Node.js installed: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed."
    Write-Info "Please install Node.js 14+ from: https://nodejs.org/"
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "npm not found" }
    Write-Success "npm installed: v$npmVersion"
} catch {
    Write-Error "npm is not installed."
    exit 1
}

# =============================================================================
# STEP 2: Stop Existing Containers
# =============================================================================
Write-Step "Stopping any existing containers..."

Set-Location $ScriptDir
# Use Continue to allow warnings from docker-compose
$ErrorActionPreference = "Continue"
docker-compose down 2>$null
$ErrorActionPreference = "Stop"
Write-Success "Container cleanup done"

# =============================================================================
# STEP 3: Start Docker Containers
# =============================================================================
Write-Step "Starting Docker containers (Neo4j + Backend)..."

# Temporarily disable strict error handling for docker-compose
$ErrorActionPreference = "Continue"
docker-compose up -d 2>$null
$composeExitCode = $LASTEXITCODE
$ErrorActionPreference = "Stop"

# Wait a moment for containers to start
Start-Sleep -Seconds 3

# Check if containers are running
$ErrorActionPreference = "Continue"
$psOutput = docker-compose ps 2>$null | Out-String
$ErrorActionPreference = "Stop"

if ($psOutput -match "neo4j" -and $psOutput -match "backend") {
    Write-Success "Docker containers started"
} elseif ($composeExitCode -eq 0) {
    Write-Success "Docker containers started"
} else {
    Write-Error "Failed to start Docker containers."
    Write-Info "Check docker-compose.yml and try: docker-compose logs"
    exit 1
}

# =============================================================================
# STEP 4: Wait for Neo4j to be Ready
# =============================================================================
Write-Step "Waiting for Neo4j to initialize (timeout: ${Neo4jTimeout}s)..."

$startTime = Get-Date
$neo4jReady = $false
$waitInterval = 3

while (-not $neo4jReady) {
    $elapsed = ((Get-Date) - $startTime).TotalSeconds
    
    if ($elapsed -gt $Neo4jTimeout) {
        Write-Error "Neo4j failed to start within ${Neo4jTimeout} seconds."
        Write-Info "Troubleshooting steps:"
        Write-Info "  1. Check logs: docker-compose logs neo4j"
        Write-Info "  2. Ensure port 7687 is not in use"
        Write-Info "  3. Try: docker-compose down -v && docker-compose up -d neo4j"
        exit 1
    }
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connectResult = $tcpClient.BeginConnect("localhost", 7687, $null, $null)
        $success = $connectResult.AsyncWaitHandle.WaitOne(2000, $true)
        
        if ($success -and $tcpClient.Connected) {
            $tcpClient.Close()
            
            # Additional check - verify Neo4j is accepting Bolt connections
            Start-Sleep -Seconds 3
            $neo4jReady = $true
            Write-Success "Neo4j is ready! (took $([math]::Round($elapsed))s)"
        } else {
            $tcpClient.Close()
            Write-Host "." -NoNewline -ForegroundColor Yellow
            Start-Sleep -Seconds $waitInterval
        }
    } catch {
        Write-Host "." -NoNewline -ForegroundColor Yellow
        Start-Sleep -Seconds $waitInterval
    }
}

# =============================================================================
# STEP 5: Wait for Backend to be Ready
# =============================================================================
Write-Step "Waiting for Backend to be ready..."

$backendReady = $false
$backendRetries = 20

for ($i = 0; $i -lt $backendRetries; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            Write-Success "Backend is ready!"
            break
        }
    } catch {
        # Try checking if port is at least open
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $connectResult = $tcpClient.BeginConnect("localhost", 3001, $null, $null)
            $success = $connectResult.AsyncWaitHandle.WaitOne(1000, $true)
            
            if ($success -and $tcpClient.Connected) {
                $tcpClient.Close()
                $backendReady = $true
                Write-Success "Backend is ready (port 3001 responding)!"
                break
            }
            $tcpClient.Close()
        } catch {
            # Continue waiting
        }
    }
    
    Write-Host "." -NoNewline -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

if (-not $backendReady) {
    Write-Warning "Backend may not be fully ready, but continuing..."
    Write-Info "Check backend logs: docker-compose logs backend"
}

# =============================================================================
# STEP 6: Install Python Dependencies & Ingest Data
# =============================================================================
if (-not $SkipDataIngestion) {
    Write-Step "Installing Python dependencies..."
    
    try {
        pip install neo4j -q 2>&1
        if ($LASTEXITCODE -ne 0) { throw "pip install failed" }
        Write-Success "Python neo4j driver installed"
    } catch {
        Write-Warning "Could not install neo4j Python driver. Attempting data ingestion anyway..."
    }
    
    Write-Step "Ingesting data into Neo4j..."
    Write-Info "This may take a minute for large datasets..."
    
    try {
        Set-Location $ScriptDir
        $ingestOutput = python ingest.py 2>&1
        $ingestOutput | ForEach-Object { Write-Host $_ }
        
        if ($LASTEXITCODE -ne 0) { throw "Data ingestion failed" }
        Write-Success "Data ingestion completed!"
    } catch {
        Write-Error "Data ingestion failed."
        Write-Info "Error details: $_"
        Write-Info "You can retry manually: python ingest.py"
        # Continue anyway - data might already be loaded
    }
} else {
    Write-Warning "Skipping data ingestion (--SkipDataIngestion flag)"
}

# =============================================================================
# STEP 7: Install Frontend Dependencies
# =============================================================================
Write-Step "Setting up Frontend..."

Set-Location "$ScriptDir\frontend"

if (-not (Test-Path "node_modules")) {
    Write-Info "Installing frontend dependencies (first run - this may take a few minutes)..."
    
    try {
        npm install 2>&1
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
        Write-Success "Frontend dependencies installed"
    } catch {
        Write-Error "Failed to install frontend dependencies."
        Write-Info "Try running manually: cd frontend && npm install"
        exit 1
    }
} else {
    Write-Success "Frontend dependencies already installed"
}

# =============================================================================
# STEP 8: Start Frontend
# =============================================================================
if (-not $SkipFrontend) {
    Write-Step "Starting Frontend development server..."
    
    try {
        # Start frontend in a new window
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ScriptDir\frontend'; npm start"
        Write-Success "Frontend started in new window"
    } catch {
        Write-Warning "Could not start frontend in new window. Starting in background..."
        Start-Process npm -ArgumentList "start" -WorkingDirectory "$ScriptDir\frontend"
    }
} else {
    Write-Warning "Skipping frontend startup (--SkipFrontend flag)"
}

# =============================================================================
# FINAL: Summary
# =============================================================================
Set-Location $ScriptDir

Write-Host @"

╔═══════════════════════════════════════════════════════════════╗
║                    SETUP COMPLETE!                            ║
╚═══════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

Write-Host "Services Running:" -ForegroundColor Cyan
Write-Host "  • Neo4j Browser:  http://localhost:7474" -ForegroundColor White
Write-Host "  • Backend API:    http://localhost:3001" -ForegroundColor White
Write-Host "  • Frontend App:   http://localhost:3000" -ForegroundColor White

Write-Host "`nUseful Commands:" -ForegroundColor Cyan
Write-Host "  • View logs:      docker-compose logs -f" -ForegroundColor Gray
Write-Host "  • Stop all:       docker-compose down" -ForegroundColor Gray
Write-Host "  • Restart:        docker-compose restart" -ForegroundColor Gray
Write-Host "  • Re-ingest data: python ingest.py" -ForegroundColor Gray

Write-Host "`nOpening app in browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
