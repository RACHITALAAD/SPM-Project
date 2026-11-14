$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js 18 or newer is required. Install it from https://nodejs.org and run this script again."
  exit 1
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
  docker compose up -d --wait
} else {
  Write-Host "Docker was not found. MongoDB must already be running at mongodb://127.0.0.1:27017."
}

$needsInstall = -not (Test-Path "node_modules") -or -not (Test-Path "server/node_modules") -or -not (Test-Path "client/node_modules")
if ($needsInstall) {
  npm run install:all
}

npm run seed
npm run dev
