'use client';

import Alert from '@cloudscape-design/components/alert';
import Button from '@cloudscape-design/components/button';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

import { BrandMark } from '@/components/ui/BrandMark';
import { login } from '@/lib/api';
import { toUserMessage } from '@/lib/queries/client';

import styles from './login.module.css';

/**
 * The sign-in screen.
 *
 * Outside the console shell entirely, so none of Cloudscape's chrome applies
 * and the composition is the design decision: a two-column split that collapses
 * to one below 900px, a single accent, and a strict vertical rhythm.
 */
export default function LoginPage() {
  return (
    // useSearchParams suspends during prerender, so the boundary is required.
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}

interface FieldErrors {
  email?: string;
  password?: string;
}

function LoginScreen() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    const { error } = await login({ body: { email: email.trim(), password } });
    setSubmitting(false);

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
    <main className={styles.page}>
      <section className={styles.brandPanel} aria-hidden="true">
        <div className={styles.brandInner}>
          <BrandMark size={56} />
          <p className={styles.brandHeadline}>
            Hosted zones, records, and routing — in one console.
          </p>
          <p className={styles.brandBody}>
            Create zones, manage all nine common record types, and see validation the
            moment it matters.
          </p>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.formInner}>
          <header className={styles.header}>
            <h1 className={styles.heading}>Sign in</h1>
            <p className={styles.subheading}>Access your hosted zones and DNS records.</p>
          </header>

          {formError && (
            <div className={styles.alertSlot}>
              <Alert type="error" header="Sign-in failed">
                {formError}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.fields}>
              <FormField label="Email address" errorText={fieldErrors.email} stretch>
                <Input
                  value={email}
                  onChange={({ detail }) => setEmail(detail.value)}
                  // Validating on blur rather than on keystroke: an error while
                  // a field is still being typed into is noise.
                  onBlur={() => setFieldErrors(collectErrors())}
                  type="email"
                  autoComplete="username"
                  placeholder="you@example.com"
                  disabled={submitting}
                />
              </FormField>

              <FormField label="Password" errorText={fieldErrors.password} stretch>
                <Input
                  value={password}
                  onChange={({ detail }) => setPassword(detail.value)}
                  onBlur={() => setFieldErrors(collectErrors())}
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={submitting}
                />
              </FormField>

              <Button variant="primary" formAction="submit" loading={submitting} fullWidth>
                Sign in
              </Button>
            </div>
          </form>

          <DemoCredentials />

          <p className={styles.disclaimer}>
            An educational UI clone built for an assignment. Not affiliated with or
            endorsed by Amazon Web Services, and it performs no DNS resolution.
          </p>
        </div>
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
 */
function DemoCredentials() {
  return (
    <div className={styles.demoBox}>
      <p className={styles.demoTitle}>Demo account</p>
      <dl className={styles.demoList}>
        <dt className={styles.demoTerm}>Email</dt>
        <dd className={styles.demoValue}>demo@route53clone.dev</dd>
        <dt className={styles.demoTerm}>Password</dt>
        <dd className={styles.demoValue}>DemoConsole2026</dd>
      </dl>
    </div>
  );
}
