#!/bin/sh
# Rebuilds the local stage server at http://localhost:3000 from this checkout
# (whatever branch is checked out), the same single image the root Dockerfile
# makes for Hamravesh. Keeps the existing local database: the app container
# beinabein-stage-app is replaced, beinabein-stage-pg and its data are untouched.
#
#   sh local-stage.sh
#
# Then open http://localhost:3000/club-owner-call and http://localhost:3000/dashboard
set -e
cd "$(dirname "$0")"

DATABASE_URL=$(docker inspect beinabein-stage-app --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null | sed -n 's/^DATABASE_URL=//p')
[ -n "$DATABASE_URL" ] || { echo "beinabein-stage-app not found — this script only refreshes an existing local stage setup"; exit 1; }

docker start beinabein-stage-pg >/dev/null
docker build -t beinabein:stage .
docker rm -f beinabein-stage-app >/dev/null
docker run -d --name beinabein-stage-app --network beinabein-stage -p 3000:3000 -e DATABASE_URL="$DATABASE_URL" beinabein:stage >/dev/null
echo "local stage running: http://localhost:3000 (dashboard at /dashboard)"
