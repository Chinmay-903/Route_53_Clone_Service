'use client';

import { Info, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { HostedZoneResponse } from '@/lib/api/types.gen';
import { useDeleteHostedZone } from '@/lib/queries/hosted-zones';

/**
 * Confirmation for deleting a hosted zone.
 *
 * Names the specific zone rather than asking "are you sure?", and styles the
 * confirming button as the destructive action so it cannot be mistaken for the
 * safe default.
 */
export function DeleteZoneModal({
  zone,
  onClose,
  onDeleted,
}: {
  zone: HostedZoneResponse | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const mutation = useDeleteHostedZone();

  async function handleDelete() {
    if (!zone) return;
    try {
      await mutation.mutateAsync(zone);
      onDeleted();
      onClose();
    } catch {
      // The mutation's onError already surfaced the reason in a toast. The
      // modal stays open so the user can read it and decide what to do.
    }
  }

  return (
    <Modal
      open={zone !== null}
      onClose={onClose}
      busy={mutation.isPending}
      tone="danger"
      icon={<Trash2 />}
      title="Delete hosted zone"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={mutation.isPending}>
            Delete zone
          </Button>
        </>
      }
    >
      <p className="text-base leading-relaxed text-ink-secondary">
        Permanently delete{' '}
        <strong className="font-semibold text-ink">{zone?.name}</strong>? You cannot undo
        this action.
      </p>

      <div className="mt-4 flex gap-2.5 rounded-lg border border-info-border bg-info-wash p-3">
        <Info className="mt-px size-4 shrink-0 text-info" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-ink-secondary">
          A zone can only be deleted once its records are gone. Its generated SOA and NS
          records are removed with it.
        </p>
      </div>
    </Modal>
  );
}
