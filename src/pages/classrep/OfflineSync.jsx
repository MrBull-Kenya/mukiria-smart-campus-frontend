import React from 'react';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { Page, Card, Btn, Stat, Notice } from '../../components/ui';

// Offline scans are queued on the STUDENT's phone and uploaded there; this page shows the queue on THIS device.
export default function OfflineSync() {
  const { isOnline, pendingCount, syncing, rejected, triggerSync, clearRejected } = useOfflineSync();
  return (
    <Page title="Offline sync" subtitle="Check-ins taken without internet are stored on this phone and upload automatically">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Connection" value={isOnline ? 'Online' : 'Offline'} tone={isOnline ? 'green' : 'red'} />
        <Stat label="Waiting to sync" value={pendingCount} tone="amber" />
        <Stat label="Rejected" value={rejected.length} tone="red" />
      </div>
      <Card className="space-y-3 max-w-xl">
        <Btn onClick={triggerSync} disabled={!isOnline || syncing || pendingCount === 0}>{syncing ? 'Syncing…' : 'Sync now'}</Btn>
        {rejected.map((r) => <Notice key={r.id} kind="error">{r.reason}</Notice>)}
        {rejected.length > 0 && <Btn variant="ghost" onClick={clearRejected}>Dismiss rejected</Btn>}
        {pendingCount === 0 && rejected.length === 0 && <Notice kind="ok">Everything on this device is synced.</Notice>}
      </Card>
    </Page>
  );
}
