'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { BrandMark } from '@/components/ui/BrandMark';
import { Button, IconButton } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { cn } from '@/lib/cn';
import { login } from '@/lib/api';
import { duration, easeOut } from '@/lib/motion';
import { toUserMessage } from '@/lib/queries/client';
import { useWarmBackend } from '@/lib/useWarmBackend';

/**
 * The canvas is client-only and never needed for the form to work.
 *
 * Loading it separately keeps roughly 4 KB of animation code off the critical
 * path, so the fields are interactive before the artwork has been fetched —
 * and if it never arrives, the mesh gradient beneath it still reads as
 * finished.
 */
const NetworkCanvas = dynamic(
  () => import('@/components/visuals/NetworkCanvas').then((module) => module.NetworkCanvas),
  { ssr: false },
);

/**
 * How long a sign-in may take before the screen explains itself.
 *
 * A warm server answers in well under a second, so anything past this means the
 * free-tier container is starting. Two and a half seconds is late enough not to
 * flash on a normal sign-in, early enough to arrive before the user assumes the
 * page has hung.
 */
const SLOW_RESPONSE_MS = 2_500;

export default function LoginPage() {
  return (
    // useSearchParams suspends during prerender, so the boundary is required.
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}

const CAPABILITIES = [
  'Nine DNS record types with server-side validation',
  'Zone file import and export in BIND or JSON',
  'Keyboard-first navigation and a command palette',
];

interface FieldErrors {
  email?: string;
  password?: string;
}

function LoginScreen() {
  const searchParams = useSearchParams();

  // Starts the free-tier container waking while the user reads and types, so
  // the cold start overlaps with something they were doing anyway.
  useWarmBackend();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [slowResponse, setSlowResponse] = useState(false);

  function collectErrors(): FieldErrors {
    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = 'Enter your email address.';
    else if (!email.includes('@')) errors.email = 'Enter a valid email address.';
    if (!password) errors.password = 'Enter your password.';
    return errors;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const errors = collectErrors();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    // Explains a long wait rather than leaving a bare spinner. Cleared in
    // `finally` so it cannot outlive the request that triggered it.
    const slowTimer = setTimeout(() => setSlowResponse(true), SLOW_RESPONSE_MS);

    let error;
    try {
      ({ error } = await login({ body: { email: email.trim(), password } }));
    } finally {
      clearTimeout(slowTimer);
      setSubmitting(false);
      setSlowResponse(false);
    }

    if (error) {
      setFormError(toUserMessage(error));
      return;
    }

    // A full navigation rather than a client-side push: the session cookie has
    // to be on the document request for the middleware to see it.
    const next = searchParams.get('next');
    window.location.assign(next?.startsWith('/') ? next : '/hosted-zones');
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel ------------------------------------------------------
          Hidden below `lg` rather than stacked: on a phone it would push the
          form below the fold, which is the one thing this screen exists for. */}
      <section
        className="relative hidden overflow-hidden bg-canvas-accent lg:block"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-mesh" />
        <NetworkCanvas className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-grid opacity-60" />
        {/* Fades the artwork out toward the form, so the seam between the two
            halves is a gradient rather than a hard edge. */}
        <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-r from-transparent to-canvas" />

        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.slow, ease: easeOut }}
            className="flex items-center gap-3 text-ink"
          >
            <span className="text-brand">
              <BrandMark size={34} animate />
            </span>
            <span className="text-lg font-semibold tracking-tight">Route 53</span>
          </motion.div>

          <div className="max-w-lg">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
              className="text-4xl font-semibold leading-tight tracking-tight text-ink xl:text-5xl"
            >
              Every query,
              <br />
              <span className="text-gradient">resolved in one console.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.2 }}
              className="mt-5 max-w-md text-md leading-relaxed text-ink-muted"
            >
              Create hosted zones, manage every common record type, and see validation
              the moment it matters.
            </motion.p>

            <ul className="mt-8 flex flex-col gap-3">
              {CAPABILITIES.map((capability, index) => (
                <motion.li
                  key={capability}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: easeOut, delay: 0.32 + index * 0.09 }}
                  className="flex items-center gap-3 text-base text-ink-secondary"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-line-accent bg-brand-wash text-brand">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {capability}
                </motion.li>
              ))}
            </ul>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-xs text-ink-faint"
          >
            An educational UI clone. Not affiliated with or endorsed by Amazon Web Services.
          </motion.p>
        </div>
      </section>

      {/* Form panel -------------------------------------------------------- */}
      <section className="flex items-center justify-center px-5 py-10 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="w-full max-w-[25rem]"
        >
          {/* The mark repeats here only where the brand panel is hidden. */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="text-brand">
              <BrandMark size={30} />
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink">Route 53</span>
          </div>

          <header className="mb-7">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">Sign in</h1>
            <p className="mt-2 text-md text-ink-muted">
              Access your hosted zones and DNS records.
            </p>
          </header>

          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              className="mb-5 overflow-hidden"
              role="alert"
            >
              <div className="flex items-start gap-2.5 rounded-lg border border-danger-border bg-danger-wash p-3">
                <TriangleAlert className="mt-px size-4 shrink-0 text-danger" aria-hidden="true" />
                <div>
                  <p className="text-base font-medium text-ink">Sign-in failed</p>
                  <p className="mt-0.5 text-sm text-ink-secondary">{formError}</p>
                </div>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Field label="Email address" error={fieldErrors.email}>
              {(field) => (
                <Input
                  {...field}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  // Validating on blur rather than on keystroke: an error while
                  // a field is still being typed into is noise.
                  onBlur={() => setFieldErrors(collectErrors())}
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  disabled={submitting}
                  leading={<Mail />}
                  autoFocus
                />
              )}
            </Field>

            <Field label="Password" error={fieldErrors.password}>
              {(field) => (
                <Input
                  {...field}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onBlur={() => setFieldErrors(collectErrors())}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={submitting}
                  leading={<Lock />}
                  trailing={
                    <IconButton
                      label={showPassword ? 'Hide password' : 'Show password'}
                      variant="ghost"
                      size="sm"
                      // `tabIndex={-1}` so tabbing from the password field
                      // reaches the submit button rather than this toggle.
                      tabIndex={-1}
                      onClick={() => setShowPassword((previous) => !previous)}
                    >
                      {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    </IconButton>
                  }
                />
              )}
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              className="mt-1 group"
            >
              Sign in
              <ArrowRight
                className="transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Button>

            {slowResponse && (
              // aria-live so the explanation is announced rather than only
              // shown; "polite" because it must not interrupt the user.
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                role="status"
                aria-live="polite"
                className="flex items-start gap-2 rounded-lg border border-line bg-surface-sunken p-3 text-sm leading-relaxed text-ink-muted"
              >
                <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" aria-hidden="true" />
                Waking the demo server — this takes up to a minute on the free tier, and
                only on the first request after it has been idle.
              </motion.p>
            )}
          </form>

          <DemoCredentials
            onUse={() => {
              setEmail('demo@route53clone.dev');
              setPassword('DemoConsole2026');
              setFieldErrors({});
              setFormError(null);
            }}
          />

          <p className="mt-8 text-xs leading-relaxed text-ink-faint lg:hidden">
            An educational UI clone built for an assignment. Not affiliated with or endorsed
            by Amazon Web Services, and it performs no DNS resolution.
          </p>
        </motion.div>
      </section>
    </main>
  );
}

/**
 * The seeded demo account, shown deliberately.
 *
 * A public demo is useless behind credentials nobody has. The account is
 * low-privilege, sees only its own seeded data, and login is rate-limited.
 * Recorded as a conscious trade-off in docs/SECURITY.md.
 *
 * The fill button exists because retyping a password from screen text is the
 * kind of small friction that makes a reviewer's first impression worse.
 */
function DemoCredentials({ onUse }: { onUse: () => void }) {
  return (
    <div
      className={cn(
        'mt-7 overflow-hidden rounded-xl border border-line bg-surface-muted',
        'transition-colors duration-200 hover:border-line-strong',
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <ShieldCheck className="size-4 text-success" aria-hidden="true" />
          Demo account
        </span>
        <Button variant="link" size="sm" onClick={onUse}>
          Use these
        </Button>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 px-3.5 py-3">
        <dt className="text-sm text-ink-faint">Email</dt>
        <dd className="truncate font-mono text-sm text-ink-secondary">
          demo@route53clone.dev
        </dd>
        <dt className="text-sm text-ink-faint">Password</dt>
        <dd className="truncate font-mono text-sm text-ink-secondary">DemoConsole2026</dd>
      </dl>
    </div>
  );
}
