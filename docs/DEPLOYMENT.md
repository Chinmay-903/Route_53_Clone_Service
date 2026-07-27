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

### 1. Cross-site cookies

The console lands on `*.vercel.app`; the API on `*.onrender.com` or `*.fly.dev`.
Those are different registrable domains, which makes every API call
**cross-site** — and a `SameSite=Lax` cookie is not sent on cross-site requests.
Login would appear to succeed, and every request after it would return 401.

`COOKIE_SAMESITE=none` fixes it, and is already set in both `render.yaml` and
`fly.toml`. `None` requires `Secure`, which `Settings.cookie_secure` turns on
automatically whenever SameSite is `none`.

**Does that weaken CSRF protection?** SameSite was never the control here. The
double-submit CSRF token in `core/security.py` is, and it is unaffected: a
cross-origin page still cannot read the `r53_csrf` cookie, so it cannot produce
the matching `X-CSRF-Token` header.

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
3. Add one environment variable:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | your API's base URL, no trailing slash |

4. Deploy, then copy the URL Vercel gives you.
5. Go back and set `CORS_ORIGINS` on the API to that exact URL — including
   `https://`, without a trailing slash. The API rejects a wildcard at startup,
   because browsers refuse a wildcard alongside credentials anyway.

> `NEXT_PUBLIC_` is the only prefix that reaches the browser bundle, and this is
> the only value that belongs there. A session secret carrying that prefix would
> be published in the JavaScript.

---

## Verifying it actually works

Three checks, each proving a different thing was configured correctly.

- [ ] **Sign in, then reload the page.** Still signed in → the cross-site cookie works. Bounced to login → `COOKIE_SAMESITE` did not take.
- [ ] **Create a zone, then redeploy.** Still there → durable storage (Fly). Gone, but the three seeded zones are back → expected on Render's free tier.
- [ ] **Open the browser console.** CORS errors → `CORS_ORIGINS` does not exactly match the Vercel URL.

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
