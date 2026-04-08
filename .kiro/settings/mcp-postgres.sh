#!/bin/bash
set -a
source "$(dirname "$0")/../../.env"
set +a
exec /home/mwangi/.local/bin/uvx mcp-server-postgres "$DATABASE_URL"
