#!/bin/sh
set -e

# Only the web container runs migrations / seed (RUN_MIGRATIONS=1); the worker just waits for the DB.
if [ "$RUN_MIGRATIONS" = "1" ]; then
  echo "Applying migrations..."
  python manage.py migrate --noinput
  if [ "$SEED_ON_START" = "1" ]; then
    echo "Loading demo data..."
    python manage.py seed_demo
  fi
fi

exec "$@"

