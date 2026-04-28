# ============================================================
#  Option Sync - Node.js Launcher for Minecraft Bedrock
# ============================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "============================================"
Write-Host " Option Sync - Minecraft Bedrock Manager"
Write-Host "============================================"
Write-Host ""

function Test-Command {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

if (-not (Test-Command "node")) {
    Write-Host "ERROR: Node.js was not found." -ForegroundColor Red
    Write-Host "Please install Node.js LTS from https://nodejs.org/"
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path (Join-Path $ScriptDir "package.json"))) {
    Write-Host "ERROR: package.json was not found." -ForegroundColor Red
    Write-Host "Run this script from the Option-Sync project folder."
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path (Join-Path $ScriptDir "node_modules"))) {
    Write-Host "Installing npm packages..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install failed." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit $LASTEXITCODE
    }
}

Write-Host "Starting Option Sync..."
Write-Host "The app opens in your browser. Keep this window open."
Write-Host ""

npm start

Write-Host ""
Write-Host "Option Sync has stopped."
Read-Host "Press Enter to close"
