# Deployment

The console deploys to **Vercel**, the API to **Fly.io with a persistent
volume**. Both halves are configured in the repository; what remains is running
the commands with your own accounts.

---

## Why a volume is mandatory

Fly machines have ephemeral root filesystems. A SQLite file written anywhere but
a mounted volume is destroyed on every deploy, every restart, and every
scale-to-zero wake — the demo would silently reset to seed data, or empty.

`fly.toml` mounts `route53_data` at `/data`, and `DATABASE_URL` points inside it.
Do not change one without the other.

---

## The cross-site cookie problem

This one bites silently, so it is worth understanding before you deploy.

The console lands on `*.vercel.app`; the API on `*.fly.dev`. Those are different
registrable domains, which makes every API call **cross-site**. A `SameSite=Lax`
cookie is not sent on cross-site requests — so login would appear to succeed,
and every request after it would return 401.

`COOKIE_SAMESITE=none` in `fly.toml` fixes it. `None` requires `Secure`, which
`Settings.cookie_secure` turns on automatically whenever SameSite is `none`.

**Does that weaken CSRF protection?** SameSite was never the control here. The
double-submit CSRF token in `core/security.py` is, and it is unaffected: a
cross-origin page still cannot read the `r53_csrf` cookie, so it cannot produce
the matching `X-CSRF-Token` header.

**The alternative,** if you would rather keep `Lax`: put both behind one origin,
either with a custom domain (`example.com` and `api.example.com` are the same
site) or by proxying `/api/*` through a Next.js rewrite. Both make the cookie
first-party. The rewrite costs a network hop; the domain costs a domain.

---

## 1 — Backend to Fly.io

```bash
cd backend && fly launch --no-deploy --copy-config --name route53-clone-api
```

Create the volume in the same region as the app:

```bash
fly volumes create route53_data --size 1 --region sin
```

Set the secrets. Generate a real session secret — do not invent one by hand:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

```bash
fly secrets set SESSION_SECRET="<paste-the-generated-value>" DEMO_USER_PASSWORD="<choose-one>" CORS_ORIGINS="https://<your-app>.vercel.app"
```

Deploy:

```bash
fly deploy
```

Confirm it is alive and that the seed ran:

```bash
curl https://route53-clone-api.fly.dev/healthz
```

> `/docs` is disabled automatically because `ENVIRONMENT=production`. That is
> deliberate — interactive docs are a deliverable locally and an information
> disclosure in production.

---

## 2 — Frontend to Vercel

Import the repository at [vercel.com/new](https://vercel.com/new) and set
**Root Directory** to `frontend`. Vercel detects Next.js from there.

Add one environment variable, for all three environments:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://route53-clone-api.fly.dev` |

Or from the CLI:

```bash
cd frontend && vercel env add NEXT_PUBLIC_API_BASE_URL production
```

```bash
cd frontend && vercel --prod
```

> `NEXT_PUBLIC_` is the only prefix that reaches the browser bundle, and this is
> the only value that belongs there. A session secret or database URL carrying
> that prefix would be published in the JavaScript.

---

## 3 — Close the loop

The two hosts have to know about each other, so one value on each side must be
updated *after* the other is deployed:

```bash
fly secrets set CORS_ORIGINS="https://<your-actual-vercel-url>"
```

Then redeploy the frontend so it builds against the real API URL.

The API rejects a wildcard `CORS_ORIGINS` at startup — browsers refuse a
wildcard alongside credentials anyway, so failing loudly at boot beats failing
mysteriously in the browser.

---

## Post-deploy checklist

- [ ] `curl https://<api>/healthz` returns `{"status":"ok"}`
- [ ] `https://<api>/docs` returns **404** — docs gated in production
- [ ] Login on the deployed console succeeds **and the next page load stays signed in** (this is the cross-site cookie test)
- [ ] Creating a zone, then reloading, shows it still there (this is the volume test)
- [ ] `fly deploy` a second time, then confirm your data survived
- [ ] Response headers include `Strict-Transport-Security` and `X-Content-Type-Options`
- [ ] No `.env`, `.git`, or source maps served from either host

---

## If the volume proves unreliable

Turso is SQLite-compatible and swaps in through the connection string alone — no
schema change, no code change:

```bash
fly secrets set DATABASE_URL="libsql://<your-db>.turso.io?authToken=<token>"
```

Keep building locally against a plain file either way.
