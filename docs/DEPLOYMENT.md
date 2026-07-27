# Deployment

Two supported paths. Both put the console on **Vercel**; they differ in where
the API runs.

| | Card required | SQLite persistence | Cold start |
|---|---|---|---|
| **Render** (default) | No | Resets on spin-down — seeded on every boot | ~1 min after 15 min idle |
| **Fly.io** | Yes | Durable, on a mounted volume | None |

Pick Render if you don't want to hand over card details. Pick Fly if durable
storage matters more than that.

---

## The two traps

Both catch people out, and both fail *silently*.

### 1. Third-party cookies are blocked

The console lands on `*.vercel.app`; the API on `*.onrender.com` or `*.fly.dev`.
Different registrable domains make the session cookie **third-party** — and
modern browsers block those by default. `SameSite=None; Secure` does *not*
rescue it: the header is correct, the browser simply discards the cookie. Login
returns 200 and every request after it is unauthenticated.

The fix is architectural, not a header. `frontend/next.config.ts` rewrites
`/api/*` to the backend, so the browser only ever talks to the Vercel origin and
the cookie is first-party. Set `API_ORIGIN` on Vercel to the backend's URL and
leave `NEXT_PUBLIC_API_BASE_URL` **unset** in production — the client then uses
relative URLs.

This also removes the need for CORS entirely, and lets the cookie stay
`SameSite=Lax`.

> The middleware matcher must exclude `/api`, or the auth redirect answers the
> proxied calls themselves with a 307 to `/login`.

### 2. Ephemeral filesystems

Render's own documentation is explicit that free web services cannot attach a
persistent disk, and that *"any changes to your web service's filesystem
(uploaded images, local SQLite databases, etc.) are lost every time the service
redeploys, restarts, or spins down."*

This application survives that only because **seeding is idempotent and runs on
boot**: every cold start restores the demo account and its three hosted zones,
so a reviewer never meets an empty console. Records created during a session
last until the next spin-down.

If that is not good enough, see [Durable storage without a card](#durable-storage-without-a-card).

---

## Path A — Render (no credit card)

`render.yaml` at the repository root describes the service, so Render reads the
configuration rather than you filling in a form.

1. Sign in at **[dashboard.render.com](https://dashboard.render.com)** with GitHub.
2. **New → Blueprint**, select this repository. Render finds `render.yaml`.
3. Approve the plan. `SESSION_SECRET` is generated for you; `CORS_ORIGINS` and
   `DEMO_USER_PASSWORD` are marked `sync: false` and must be filled in.
4. Set those two under **Environment**:
   - `DEMO_USER_PASSWORD` — whatever you want the demo login to be
   - `CORS_ORIGINS` — a placeholder for now, corrected in step 3 of the Vercel section
5. Deploy, then check it is alive:

```bash
curl https://route53-clone-api.onrender.com/healthz
```

> The first request after a spin-down takes 30–60 seconds. That is the free tier
> waking the container, not a fault.

---

## Path B — Fly.io (durable, needs a card)

```bash
cd backend && fly launch --no-deploy --copy-config --name route53-clone-api
```

```bash
fly volumes create route53_data --size 1 --region bom
```

Generate a real session secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

```bash
fly secrets set SESSION_SECRET="<generated>" DEMO_USER_PASSWORD="<chosen>" CORS_ORIGINS="https://<your-app>.vercel.app"
```

```bash
fly deploy
```

The volume is not optional. Fly machines have ephemeral root filesystems, so a
SQLite file written anywhere but `/data` is destroyed on every deploy. The
volume's name and region must match `fly.toml`.

---

## The console — Vercel (both paths)

1. Import the repository at **[vercel.com/new](https://vercel.com/new)**.
2. Set **Root Directory** to `frontend`. The build fails without this.
3. Add **one** environment variable:

| Name | Value |
|---|---|
| `API_ORIGIN` | your API's base URL, no trailing slash |

4. Deploy.

> Do **not** set `NEXT_PUBLIC_API_BASE_URL` in production. Leaving it unset makes
> the client use relative URLs, which the `/api` rewrite proxies to `API_ORIGIN`
> — and that is exactly what keeps the session cookie first-party. Setting it
> would send the browser straight to the other domain and the cookie would be
> blocked again.
>
> `API_ORIGIN` deliberately has no `NEXT_PUBLIC_` prefix: the rewrite resolves on
> the server, so the value never needs to reach the browser bundle.

---

## Verifying it actually works

Three checks, each proving a different thing was configured correctly.

- [ ] **Sign in, then reload the page.** Still signed in → the proxy and first-party cookie work. Bounced to login → `API_ORIGIN` is unset, or `NEXT_PUBLIC_API_BASE_URL` is set when it should not be.
- [ ] **Create a zone, then redeploy.** Still there → durable storage (Fly). Gone, but the three seeded zones are back → expected on Render's free tier.
- [ ] **Check `/api/v1/auth/me` in the network tab.** It should be a *relative* request to your Vercel origin, not to the API's domain.

Also confirm:

```bash
curl -o /dev/null -w "%{http_code}\n" https://<your-api>/docs
```

`404` is correct. Interactive docs are a deliverable locally and an information
disclosure in production, so `ENVIRONMENT=production` switches them off.

---

## Durable storage without a card

Turso is libSQL — SQLite-compatible — with a free tier that needs no card. Since
it speaks the same dialect, the connection string is the only change:

```bash
pip install sqlalchemy-libsql
```

Then set `DATABASE_URL` to your Turso URL with its auth token. Verify locally
before relying on it: the driver is a third-party SQLAlchemy dialect, not the
stdlib `sqlite3` this project is otherwise built on, and that is worth proving
on your own machine rather than discovering in production.
