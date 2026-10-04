import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { getAdmNo } from '../../config/campus';
import { Page, Async, Stat, Card, Table, Badge } from '../../components/ui';

export default function MyRank() {
  const { user } = useAuth();
  const board = useFetch('/student/leaderboard');
  const card = useFetch(`/gamification/scorecard/${encodeURIComponent(getAdmNo(user))}`);

  return (
    <Page title="My rank & points" subtitle="On-time check-ins earn 15 points, late ones 5. Resets weekly.">
      <Async state={card}>
        {(c) => (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat label="My points" value={c.student?.points ?? 0} tone="blue" />
              <Stat label="Class rank" value={board.data?.myRank ? `${board.data.myRank} / ${board.data.total}` : '—'} />
              <Stat label="Badges" value={(c.badges || []).length} tone="amber" />
            </div>
            {(c.badges || []).length > 0 && (
              <Card><div className="flex flex-wrap gap-2">{c.badges.map((b) => <Badge key={b.id} tone="amber">{b.badge_name}</Badge>)}</div></Card>
            )}
          </>
        )}
      </Async>
      <h2 className="text-sm font-bold text-gray-700">Class leaderboard</h2>
      <Async state={board}>
        {(b) => <Table rows={b.top} empty="No points yet." columns={[
          { key: 'rank', label: '#' },
          { key: 'name', label: 'Name', render: (r) => <span className={r.isMe ? 'font-black text-blue-700' : ''}>{r.name}{r.isMe ? ' (you)' : ''}</span> },
          { key: 'points', label: 'Points' },
        ]} />}
      </Async>
    </Page>
  );
}
