'use client';

import { Trash2 } from 'lucide-react';

import { RecordTypeBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { RecordSetResponse } from '@/lib/api/types.gen';
import { useDeleteRecord } from '@/lib/queries/records';

/** Confirmation for deleting a record set, naming the specific record. */
export function DeleteRecordModal({
  zoneId,
  record,
  onClose,
  onDeleted,
}: {
  zoneId: string;
  record: RecordSetResponse | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const mutation = useDeleteRecord(zoneId);

  async function handleDelete() {
    if (!record) return;
    try {
      await mutation.mutateAsync(record);
      onDeleted();
      onClose();
    } catch {
      // Reported in a toast; the modal stays open so the reason is readable.
    }
  }

  return (
    <Modal
      open={record !== null}
      onClose={onClose}
      busy={mutation.isPending}
      tone="danger"
      icon={<Trash2 />}
      title="Delete record"
      description="You cannot undo this action."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={mutation.isPending}>
            Delete record
          </Button>
        </>
      }
    >
      {record && (
        <div className="rounded-lg border border-line bg-surface-sunken p-3">
          <div className="flex items-center gap-2">
            <RecordTypeBadge type={record.type} />
            <code className="min-w-0 truncate font-mono text-sm font-medium text-ink">
              {record.name}
            </code>
          </div>

          {record.values.length > 0 && (
            <ul className="mt-2.5 flex flex-col gap-0.5 border-t border-line pt-2.5">
              {record.values.map((value, index) => (
                <li
                  key={`${value}-${index}`}
                  className="truncate font-mono text-xs text-ink-muted"
                >
                  {value}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
