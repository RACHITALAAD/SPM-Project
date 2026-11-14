#!/usr/bin/env bash
set -euo pipefail

cd "$(cd "$(dirname "$0")" && pwd)/.."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18 or newer is required."
  echo "Install it from https://nodejs.org and run this script again."
  exit 1
fi

node_major="$(node -p "process.versions.node.split('.')[0]")"
if [ "$node_major" -lt 18 ]; then
  echo "Node.js 18 or newer is required. Current: $(node -v)"
  exit 1
fi

if command -v docker >/dev/null 2>&1; then
  docker compose up -d --wait
else
  echo "Docker was not found. MongoDB must already be running at mongodb://127.0.0.1:27017."
fi

if [ ! -d node_modules ] || [ ! -d server/node_modules ] || [ ! -d client/node_modules ]; then
  npm run install:all
fi

npm run seed
npm run dev
