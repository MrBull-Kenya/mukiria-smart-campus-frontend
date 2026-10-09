import React from 'react';
import { useFetch } from '../../hooks/useFetch';
import FileActions, { fmtSize } from '../../components/FileActions';
import { Page, Async, Table, Badge, Card, Notice } from '../../components/ui';

export default function Timetable() {
  const state = useFetch('/student/timetable');

  return (
    <Page title="Class timetable" subtitle="The latest timetable approved for your class">
      <Async state={state}>
        {(data) => !data.version ? <Notice kind="info">There is no approved timetable for your class yet.</Notice> : (
          <>
            <Card className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-black text-gray-900">{data.version.term || 'Approved timetable'}</h2>
                <Badge tone="green">Approved</Badge>
                <span className="text-xs text-gray-500">Updated {data.version.uploaded}</span>
              </div>
              {data.version.comment && <p className="text-xs text-gray-600">HOD comment: {data.version.comment}</p>}
              {data.version.file && (
                <p className="flex flex-wrap items-center gap-3 text-sm text-gray-700">
                  <span>📎 <strong>{data.version.file.name}</strong> <span className="text-xs text-gray-400">({fmtSize(data.version.file.size)})</span></span>
                  <FileActions url={`/student/timetable/${data.version.id}/file`} file={data.version.file} />
                </p>
              )}
            </Card>
            {data.slots.length > 0
              ? <Table rows={data.slots} columns={[
                { key: 'day', label: 'Day' },
                { key: 'time', label: 'Time' },
                { key: 'unit', label: 'Unit' },
                { key: 'venue', label: 'Venue' },
                { key: 'lecturer', label: 'Lecturer' },
              ]} />
              : !data.version.file && <Notice kind="info">This approved timetable has no lesson table or attached file.</Notice>}
          </>
        )}
      </Async>
    </Page>
  );
}
