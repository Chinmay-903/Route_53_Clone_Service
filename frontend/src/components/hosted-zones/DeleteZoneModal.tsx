'use client';

import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Modal from '@cloudscape-design/components/modal';
import SpaceBetween from '@cloudscape-design/components/space-between';

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
      // The mutation's onError already surfaced the reason in a Flashbar. The
      // modal stays open so the user can read it and decide what to do.
    }
  }

  return (
    <Modal
      visible={zone !== null}
      onDismiss={onClose}
      header="Delete hosted zone"
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
      <SpaceBetween size="m">
        <Box variant="span">
          Permanently delete <Box variant="strong">{zone?.name}</Box>? You cannot undo this
          action.
        </Box>
        <Alert type="info">
          A zone can only be deleted once its records are gone. Its generated SOA and NS
          records are removed with it.
        </Alert>
      </SpaceBetween>
    </Modal>
  );
}
