# Scheduled Jobs

## Task due-date reminders

`GET /api/cron/reminders` finds incomplete, client-visible tasks whose `dueDate`
falls within the next 48 hours and have not yet been reminded
(`reminderSentAt IS NULL`). For each, it:

1. Stamps `reminderSentAt` so the task is never reminded twice for the same due window.
2. Sends an in-app notification (bell) — unless the client disabled
   "Task due-date reminders" in their profile.
3. Sends a reminder email — same opt-out.

The endpoint is protected by a bearer token: if `CRON_SECRET` is set in the app
environment, requests must send `Authorization: Bearer <CRON_SECRET>`.

### Scheduling on Cloudways (production)

> **Important:** `vercel.json` defines a cron, but that only works on Vercel.
> This app deploys on Cloudways, so the schedule must be configured on the host.

Use **Application Settings → Cron Job Management** in the Cloudways panel, or add
a crontab entry over SSH. To run daily at 9:00am server time:

```cron
0 9 * * * APP_URL=https://your-portal-domain.com CRON_SECRET=your-secret /path/to/app/scripts/send-reminders.sh >> /tmp/reminders.log 2>&1
```

Or call the endpoint directly without the helper script:

```cron
0 9 * * * curl -fsS -H "Authorization: Bearer your-secret" https://your-portal-domain.com/api/cron/reminders
```

Set `CRON_SECRET` to the same value in the app's environment variables and the
cron command. The job is idempotent within a due window, so a missed run is
caught up on the next day's run.

### Local testing

```bash
APP_URL=http://localhost:3000 CRON_SECRET=$CRON_SECRET ./scripts/send-reminders.sh
# or, if CRON_SECRET is not set in the app env (auth is skipped):
curl http://localhost:3000/api/cron/reminders
```

The response reports `{ "scanned": N, "reminded": M }`.

## Weekly activity digest

`GET /api/cron/digest` emails each opted-in client (preference "Weekly activity
summary") a summary of the past 7 days for their company: new tasks, messages,
pending approvals, invoices, accepted proposals, and hours logged. Quiet weeks
(no activity) are skipped — no email is sent. Same `CRON_SECRET` bearer auth.

Recommended schedule — Monday 8:00am:

```cron
0 8 * * 1 APP_URL=https://your-portal-domain.com CRON_SECRET=your-secret /path/to/app/scripts/send-reminders.sh
```

The helper script targets the reminders endpoint; for the digest, point the cron
at `/api/cron/digest` instead:

```cron
0 8 * * 1 curl -fsS -H "Authorization: Bearer your-secret" https://your-portal-domain.com/api/cron/digest
```

Response: `{ "recipients": N, "sent": M }`.
