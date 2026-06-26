#!/usr/bin/env bash
#
# Triggers the daily task due-date reminder job.
# Intended to be run by a scheduler (Cloudways Cron Job Management or crontab).
#
# Required environment variables:
#   APP_URL       Base URL of the deployed app, e.g. https://portal.example.com
#   CRON_SECRET   Must match the CRON_SECRET configured in the app's environment
#
# Example crontab entry (runs daily at 9:00am server time):
#   0 9 * * * APP_URL=https://portal.example.com CRON_SECRET=xxxx /path/to/scripts/send-reminders.sh
#
set -euo pipefail

: "${APP_URL:?APP_URL is required}"
: "${CRON_SECRET:?CRON_SECRET is required}"

curl -fsS \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "${APP_URL%/}/api/cron/reminders"
