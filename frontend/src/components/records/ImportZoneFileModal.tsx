'use client';

import { AlertTriangle, CheckCircle2, FileText, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button, IconButton } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import type { ImportResponse } from '@/lib/api/types.gen';
import { useImportZoneFile } from '@/lib/queries/zone-files';

/** 256 KB, matching the server's own cap so the UI refuses before uploading. */
const MAX_FILE_BYTES = 256 * 1024;

/**
 * Uploads a BIND zone file into a hosted zone.
 *
 * The server re-checks everything this form checks — size, type, and every DNS
 * rule. The client-side limits exist to fail fast on an obvious mistake, not to
 * be the defence.
 */
export function ImportZoneFileModal({
  zoneId,
  zoneName,
  visible,
  onClose,
}: {
  zoneId: string;
  zoneName: string;
  visible: boolean;
  onClose: () => void;
}) {
  const mutation = useImportZoneFile(zoneId);
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const tooLarge = Boolean(file && file.size > MAX_FILE_BYTES);

  function reset() {
    setFile(null);
    setResult(null);
    setDragging(false);
    onClose();
  }

  function accept(next: File | null | undefined) {
    setFile(next ?? null);
    setResult(null);
  }

  async function handleImport() {
    if (!file || tooLarge) return;
    try {
      setResult(await mutation.mutateAsync(file));
    } catch {
      // Reported in a toast by the mutation; the modal stays open so the user
      // can pick a different file.
    }
  }

  return (
    <Modal
      open={visible}
      onClose={reset}
      busy={mutation.isPending}
      size="lg"
      icon={<Upload />}
      title="Import records"
      description={`Adds record sets to ${zoneName} from an RFC 1035 master file.`}
      footer={
        <>
          <Button variant="ghost" onClick={reset} disabled={mutation.isPending}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            loading={mutation.isPending}
            disabled={!file || tooLarge}
          >
            Import records
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/*
          A styled label wrapping a visually-hidden file input, rather than a
          div with a click handler. The native input keeps the control
          keyboard-operable and announced as a file picker for free — a div
          would need a role, a tabindex, and key handlers to get halfway there.
        */}
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            accept(event.dataTransfer.files[0]);
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center',
            'transition-all duration-200',
            dragging
              ? 'scale-[1.01] border-brand bg-brand-wash'
              : 'border-line-strong bg-surface-sunken hover:border-brand hover:bg-brand-wash/40',
            'focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--brand-ring)]',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".zone,.txt,text/plain"
            className="sr-only"
            onChange={(event) => accept(event.target.files?.[0])}
            disabled={mutation.isPending}
          />

          <span
            className={cn(
              'flex size-11 items-center justify-center rounded-xl border transition-colors',
              dragging
                ? 'border-line-accent bg-brand text-brand-contrast'
                : 'border-line bg-surface text-ink-muted',
            )}
            aria-hidden="true"
          >
            <Upload className="size-5" />
          </span>

          <span className="text-base font-medium text-ink">
            {dragging ? 'Drop to upload' : 'Drop a zone file, or click to browse'}
          </span>
          <span className="text-sm text-ink-faint">
            Plain text, up to 256 KB. $INCLUDE directives are rejected.
          </span>
        </label>

        {file && (
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg border px-3 py-2.5',
              tooLarge ? 'border-danger-border bg-danger-wash' : 'border-line bg-surface',
            )}
          >
            <FileText
              className={cn('size-4 shrink-0', tooLarge ? 'text-danger' : 'text-ink-faint')}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium text-ink">{file.name}</p>
              <p className={cn('text-xs', tooLarge ? 'text-danger' : 'text-ink-faint')}>
                {formatBytes(file.size)}
                {tooLarge && ' — exceeds the 256 KB limit'}
              </p>
            </div>
            <IconButton
              label="Remove file"
              variant="ghost"
              size="sm"
              onClick={() => {
                accept(null);
                // Clearing the input's value too, so re-picking the same file
                // still fires `change` — the browser suppresses it otherwise.
                if (inputRef.current) inputRef.current.value = '';
              }}
              disabled={mutation.isPending}
            >
              <X aria-hidden="true" />
            </IconButton>
          </div>
        )}

        {result && <ImportResult result={result} />}
      </div>
    </Modal>
  );
}

/** Reports what the import created and what it declined. */
function ImportResult({ result }: { result: ImportResponse }) {
  const created = result.created > 0;

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          'flex items-start gap-2.5 rounded-lg border p-3',
          created
            ? 'border-success-border bg-success-wash'
            : 'border-warning-border bg-warning-wash',
        )}
      >
        {created ? (
          <CheckCircle2 className="mt-px size-4 shrink-0 text-success" aria-hidden="true" />
        ) : (
          <AlertTriangle className="mt-px size-4 shrink-0 text-warning" aria-hidden="true" />
        )}
        <p className="text-base text-ink-secondary">
          <strong className="font-semibold text-ink">
            {result.created} record set{result.created === 1 ? '' : 's'}
          </strong>{' '}
          created
          {result.skipped.length > 0 && `, ${result.skipped.length} skipped`}.
        </p>
      </div>

      {result.skipped.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Entries skipped during import</caption>
            <thead>
              <tr className="bg-surface-muted">
                <th scope="col" className="w-14 px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                  Line
                </th>
                <th scope="col" className="px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                  Entry
                </th>
                <th scope="col" className="px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-ink-faint">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody>
              {result.skipped.map((item) => (
                <tr key={`${item.line}-${item.text}`} className="border-t border-line">
                  <td className="px-3 py-2 tabular-nums text-ink-faint">
                    {/* Line 0 means the record was rejected as a whole rather
                        than at a specific line, so a dash reads better than a
                        misleading "0". */}
                    {item.line > 0 ? item.line : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <code className="font-mono text-xs text-ink-secondary">{item.text}</code>
                  </td>
                  <td className="px-3 py-2 text-ink-muted">{item.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
