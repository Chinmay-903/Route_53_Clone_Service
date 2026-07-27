import { ArrowLeft, Globe } from 'lucide-react';
import Link from 'next/link';

import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';

/** The 404 page — designed, not a raw framework default. */
export default function NotFound() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-12">
      <div className="absolute inset-0 bg-mesh" aria-hidden="true" />
      <div className="absolute inset-0 bg-grid opacity-70" aria-hidden="true" />

      <div className="relative w-full max-w-lg text-center">
        <Link
          href="/hosted-zones"
          className="mb-12 inline-flex items-center gap-2.5 text-ink transition-opacity hover:opacity-80"
        >
          <span className="text-brand">
            <BrandMark size={28} />
          </span>
          <span className="text-md font-semibold tracking-tight">Route 53</span>
        </Link>

        {/* The status is decoration at this size — the heading beneath carries
            the meaning, so the digits are hidden from assistive technology to
            avoid announcing "four hundred and four" before the explanation. */}
        <p
          className="text-gradient text-6xl font-semibold leading-none tracking-tight sm:text-[5rem]"
          aria-hidden="true"
        >
          404
        </p>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
          That page does not exist
        </h1>

        <p className="mx-auto mt-3 max-w-[42ch] text-md leading-relaxed text-ink-muted">
          The address may be mistyped, or the resource may have been deleted.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <Button variant="primary" size="lg" asChild>
            <Link href="/hosted-zones">
              <Globe aria-hidden="true" />
              Go to hosted zones
            </Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/dashboard">
              <ArrowLeft aria-hidden="true" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
