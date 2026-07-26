'use client';

import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Modal from '@cloudscape-design/components/modal';
import SpaceBetween from '@cloudscape-design/components/space-between';

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
      // Reported in a Flashbar; the modal stays open so the reason is readable.
    }
  }

  return (
    <Modal
      visible={record !== null}
      onDismiss={onClose}
      header="Delete record"
      closeAriaLabel="Close"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDelete} loading={mutation.isPending}>
              Delete
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="s">
        <Box variant="span">
          Permanently delete the <Box variant="strong">{record?.type}</Box> record{' '}
          <Box variant="strong">{record?.name}</Box>? You cannot undo this action.
        </Box>
        {record && record.values.length > 0 && (
          <Box variant="code" fontSize="body-s" color="text-status-inactive">
            {record.values.join('\n')}
          </Box>
        )}
      </SpaceBetween>
    </Modal>
  );
}
