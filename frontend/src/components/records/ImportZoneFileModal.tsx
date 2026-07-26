'use client';

import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import FileUpload from '@cloudscape-design/components/file-upload';
import FormField from '@cloudscape-design/components/form-field';
import Modal from '@cloudscape-design/components/modal';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import { useState } from 'react';

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
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<ImportResponse | null>(null);

  const file = files[0];
  const tooLarge = Boolean(file && file.size > MAX_FILE_BYTES);

  function reset() {
    setFiles([]);
    setResult(null);
    onClose();
  }

  async function handleImport() {
    if (!file || tooLarge) return;
    try {
      setResult(await mutation.mutateAsync(file));
    } catch {
      // Reported in a Flashbar by the mutation; the modal stays open so the
      // user can pick a different file.
    }
  }

  return (
    <Modal
      visible={visible}
      onDismiss={reset}
      size="large"
      header={`Import records into ${zoneName}`}
      closeAriaLabel="Close"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={reset} disabled={mutation.isPending}>
              {result ? 'Close' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              loading={mutation.isPending}
              disabled={!file || tooLarge}
            >
              Import
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="l">
        <FormField
          label="Zone file"
          description="An RFC 1035 master file, as exported from this console or from BIND."
          constraintText="Plain text, up to 256 KB. $INCLUDE directives are rejected."
          errorText={tooLarge ? 'File exceeds the 256 KB limit.' : undefined}
        >
          <FileUpload
            value={files}
            onChange={({ detail }) => {
              setFiles(detail.value);
              setResult(null);
            }}
            accept=".zone,.txt,text/plain"
            showFileSize
            showFileLastModified
            constraintText=""
            i18nStrings={{
              uploadButtonText: () => 'Choose file',
              dropzoneText: () => 'Drop a zone file here',
              removeFileAriaLabel: (index) => `Remove file ${index + 1}`,
              errorIconAriaLabel: 'Error',
            }}
          />
        </FormField>

        {result && <ImportResult result={result} />}
      </SpaceBetween>
    </Modal>
  );
}

/** Reports what the import created and what it declined. */
function ImportResult({ result }: { result: ImportResponse }) {
  return (
    <SpaceBetween size="m">
      <Alert type={result.created > 0 ? 'success' : 'warning'}>
        {result.created} record set{result.created === 1 ? '' : 's'} created
        {result.skipped.length > 0 && `, ${result.skipped.length} skipped`}.
      </Alert>

      {result.skipped.length > 0 && (
        <Table
          variant="embedded"
          header={<Box variant="h4">Skipped entries</Box>}
          items={result.skipped}
          trackBy={(item) => `${item.line}-${item.text}`}
          columnDefinitions={[
            {
              id: 'line',
              header: 'Line',
              width: 80,
              // Line 0 means the record was rejected as a whole rather than at
              // a specific line, so a dash reads better than a misleading "0".
              cell: (item) => (item.line > 0 ? item.line : '—'),
            },
            {
              id: 'text',
              header: 'Entry',
              cell: (item) => <Box variant="code">{item.text}</Box>,
            },
            { id: 'reason', header: 'Reason', cell: (item) => item.reason },
          ]}
        />
      )}
    </SpaceBetween>
  );
}
