Write-Host "[START] Starting WD Project Stack..." -ForegroundColor Cyan

# 1. Stop existing containers to ensure a clean slate
Write-Host "[STOP] Stopping existing Docker containers..." -ForegroundColor Yellow
docker-compose down

# 2. Start Docker containers
Write-Host "[DOCKER] Starting Neo4j and Backend..." -ForegroundColor Yellow
docker-compose up -d

# 3. Wait for Neo4j to be ready
Write-Host "[WAIT] Waiting for Neo4j to initialize (this may take up to 60s)..." -ForegroundColor Yellow
$retries = 30
$connected = $false

while ($retries -gt 0) {
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connectResult = $tcpClient.BeginConnect("localhost", 7687, $null, $null)
        $success = $connectResult.AsyncWaitHandle.WaitOne(1000, $true)
        
        if ($success -and $tcpClient.Connected) {
            $tcpClient.Close()
            $connected = $true
            Write-Host "`n[OK] Neo4j is ready!" -ForegroundColor Green
            break
        }
    } catch {
        # Ignore errors and retry
    }
    
    Start-Sleep -Seconds 2
    $retries--
    Write-Host "." -NoNewline
}

if (-not $connected) {
    Write-Host "`n[ERROR] Neo4j failed to start in time. Please check 'docker-compose logs neo4j'." -ForegroundColor Red
    exit
}

# 4. Ingest Data
Write-Host "[DATA] Ingesting data into Neo4j..." -ForegroundColor Yellow
# Ensure python dependencies are installed for the script
try {
    pip install neo4j -q
    python ingest.py
} catch {
    Write-Host "[ERROR] Data ingestion failed. Make sure python and neo4j driver are installed." -ForegroundColor Red
}

# 5. Start Frontend
Write-Host "[FRONTEND] Starting Frontend..." -ForegroundColor Yellow
Set-Location frontend

if (-not (Test-Path "node_modules")) {
    Write-Host "[NPM] Installing frontend dependencies (first run)..."
    npm install
}

Write-Host "[LAUNCH] Launching React App in a new window..." -ForegroundColor Green
# Start npm start in a new independent window
if ($IsWindows) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start"
} else {
    # Fallback for non-Windows (though this script is PS)
    npm start
}

Write-Host "`n[SUCCESS] All services started! Access the app at http://localhost:3000" -ForegroundColor Cyan
