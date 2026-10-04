import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Card, Stat, Notice, Badge } from '../../components/ui';

const kes = (n) => `KES ${Number(n).toLocaleString('en-KE')}`;

export default function FeesClearance() {
  const state = useFetch('/campus/fees');
  return (
    <Page title="Fees clearance" subtitle="Fee balances are entered by the finance office / HOD">
      <Async state={state}>
        {(d) => !d.recorded ? <Notice kind="warn">{d.message}</Notice> : (
          <>
            <Card className={d.isCleared ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}>
              <p className="font-black text-lg">{d.isCleared ? '✓ Cleared' : 'Balance outstanding'} <Badge tone={d.isCleared ? 'green' : 'amber'}>{d.isCleared ? 'Cleared' : 'Not cleared'}</Badge></p>
              <p className="text-xs text-gray-600">{d.name} · {d.adm} · updated {d.updated}</p>
            </Card>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Total fees" value={kes(d.totalFees)} /><Stat label="Paid" value={kes(d.paidAmount)} tone="green" /><Stat label="Balance" value={kes(d.balance)} tone={d.balance ? 'red' : 'green'} />
            </div>
          </>
        )}
      </Async>
    </Page>
  );
}
