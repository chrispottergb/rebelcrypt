# Deploying the Global Music AI Platform

The fastest way to get this online with a public URL (reachable from your
phone) is **Render**, using the included [`render.yaml`](./render.yaml) Blueprint.
No Kubernetes, no servers to manage.

## One-click deploy to Render

1. Push this repo to GitHub (already done if you're reading this on GitHub).
2. Create a free account at https://render.com and connect your GitHub.
3. In Render: **New +** → **Blueprint**.
4. Select the `rebelcrypt` repository.
5. Render reads `render.yaml` and shows the services it will create
   (the API + 5 frontends). Click **Apply**.
6. Wait for the first build (a few minutes per service).

When it finishes you'll get public URLs like:

| Service | URL |
|---|---|
| API | `https://rebelcrypt-api.onrender.com/api/v1/health` |
| Workflow Studio | `https://rebelcrypt-workflow-studio.onrender.com` |
| Industry Console | `https://rebelcrypt-industry-console.onrender.com` |
| Ops Dashboard | `https://rebelcrypt-ops-dashboard.onrender.com` |
| Exec Portal | `https://rebelcrypt-exec-portal.onrender.com` |
| Education Console | `https://rebelcrypt-education-console.onrender.com` |

Open any of them on your phone — they're real public HTTPS URLs.

### Try the live API

```bash
# Health
curl https://rebelcrypt-api.onrender.com/api/v1/health

# Register, then log in to get a token
curl -X POST https://rebelcrypt-api.onrender.com/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"secret123"}'

curl -X POST https://rebelcrypt-api.onrender.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"secret123"}'
```

## Free-tier notes

- Free Render web services **spin down after ~15 minutes of inactivity** and
  take ~30–60s to wake on the next request. That's normal for free; upgrade a
  service to a paid instance to keep it always-on.
- The API runs an **in-memory store**, so data resets when the service
  restarts. Wire a managed Postgres (add a `databases:` block to `render.yaml`
  and read `DATABASE_URL`) when you need persistence.

## Alternative: Railway

Railway also deploys straight from the Dockerfiles:

1. https://railway.app → **New Project** → **Deploy from GitHub repo**.
2. Add a service per app, setting each one's **Dockerfile path**
   (`Dockerfile` for the API, `packages/ui/<app>/Dockerfile` for a frontend).
3. Railway injects `PORT`; the apps already honor it.

## Self-hosting with Docker Compose

To run the whole stack (incl. Postgres, Redis, Prometheus, Grafana) on one
machine:

```bash
cp .env.example .env
docker compose up --build
```

See the URLs printed in the README.
