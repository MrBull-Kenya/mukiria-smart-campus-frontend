import React, { useMemo, useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { Page, Async, Badge, Card, Table } from '../../components/ui';

export default function ActivityLog() {
  const state = useFetch('/admin/activity', { pollMs: 5000 });
  const [search, setSearch] = useState('');
  const entries = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = state.data || [];
    return term ? rows.filter((row) => `${row.actor} ${row.role} ${row.method} ${row.route} ${row.status}`.toLowerCase().includes(term)) : rows;
  }, [state.data, search]);

  return (
    <Page title="Live activity log" subtitle="Recent account actions across the campus system · updates every 5 seconds">
      <Async state={state}>
        {(rows) => (
          <>
            <Card className="flex flex-wrap items-end justify-between gap-3">
              <label className="block w-full max-w-lg">
                <span className="mb-1 block text-xs font-bold text-gray-700">Search activity</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a person, role, action, or endpoint" className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
              </label>
              <span className="pb-2 text-xs text-gray-500">Showing {entries.length} of {rows.length} recent actions</span>
            </Card>
            <Table rows={entries} empty="No account actions have been recorded yet." columns={[
              { key: 'time', label: 'When' },
              { key: 'actor', label: 'Who' },
              { key: 'role', label: 'Role', render: (row) => <Badge tone="blue">{row.role}</Badge> },
              { key: 'action', label: 'Action', render: (row) => <span className="font-semibold">{row.method} <code className="text-xs text-gray-600">{row.route}</code></span> },
              { key: 'status', label: 'Result', render: (row) => <Badge tone={row.status >= 200 && row.status < 300 ? 'green' : 'amber'}>{row.status}</Badge> },
            ]} />
          </>
        )}
      </Async>
    </Page>
  );
}
