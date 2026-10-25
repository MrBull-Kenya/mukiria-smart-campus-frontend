import React, { useState } from 'react';

export const Page = ({ title, subtitle, actions, children }) => (
  <div className="space-y-5 p-4 md:p-6">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-blue-800 md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </header>
    {children}
  </div>
);

export const Spinner = ({ label = 'Loading…', className = '' }) => (
  <div role="status" aria-live="polite" className={`flex justify-center p-10 ${className}`}>
    <span className="relative inline-flex h-10 w-10 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 40 40" className="h-10 w-10 animate-spin text-blue-700">
        <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="3" />
        <path d="M20 4a16 16 0 0 1 15.5 12" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      </svg>
      <span className="absolute h-1.5 w-1.5 rounded-full bg-blue-700" />
    </span>
    <span className="sr-only">{label}</span>
  </div>
);

export const ErrorBox = ({ error, onRetry }) => (
  <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
    <span>{error}</span>
    {onRetry && <button onClick={() => onRetry()} className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold underline underline-offset-2 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600">Retry</button>}
  </div>
);

export const Notice = ({ kind = 'info', children }) => {
  const tone = { info: 'bg-blue-50 border-blue-200 text-blue-800', ok: 'bg-emerald-50 border-emerald-200 text-emerald-800', warn: 'bg-amber-50 border-amber-200 text-amber-800', error: 'bg-rose-50 border-rose-200 text-rose-700' }[kind];
  return <div role={kind === 'error' || kind === 'warn' ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm font-medium ${tone}`}>{children}</div>;
};

// state = result of useFetch(); children(data) renders once real data has arrived
export function Async({ state, children }) {
  if (state.error) return <ErrorBox error={state.error} onRetry={state.reload} />;
  if (state.loading && state.data == null) return <Spinner />;
  if (state.data == null) return null;
  return children(state.data);
}

export const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.03] ${className}`}>{children}</div>
);

const TONES = {
  blue: { value: 'text-blue-800', mark: 'bg-blue-700', progress: 'bg-blue-700' },
  green: { value: 'text-emerald-700', mark: 'bg-emerald-600', progress: 'bg-emerald-600' },
  red: { value: 'text-rose-700', mark: 'bg-rose-600', progress: 'bg-rose-600' },
  amber: { value: 'text-amber-700', mark: 'bg-amber-500', progress: 'bg-amber-500' },
  gray: { value: 'text-slate-900', mark: 'bg-slate-400', progress: 'bg-slate-500' },
};
export const ProgressBar = ({ value, tone = 'blue', label, ariaLabel, className = '' }) => {
  const percentage = Number.isFinite(Number(value)) ? Math.min(100, Math.max(0, Number(value))) : 0;
  const colors = TONES[tone] || TONES.blue;
  return (
    <div className={className}>
      {label && <div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-medium text-slate-600">{label}</span><span className="font-bold tabular-nums text-slate-800">{percentage.toFixed(1)}%</span></div>}
      <div role="progressbar" aria-label={ariaLabel || label || 'Progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage} className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-[width] duration-500 ${colors.progress}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export const Stat = ({ label, value, tone = 'gray', hint, progress }) => {
  const colors = TONES[tone] || TONES.gray;
  return (
    <Card className="relative overflow-hidden">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${colors.mark}`} />
      <div className="pl-1">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-1 text-2xl font-extrabold tracking-tight tabular-nums ${colors.value}`}>{value}</p>
        {hint && <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>}
        {progress !== undefined && <ProgressBar value={progress} tone={tone} ariaLabel={`${label} progress`} className="mt-3" />}
      </div>
    </Card>
  );
};

const BADGES = { green: 'bg-emerald-100 text-emerald-800', red: 'bg-rose-100 text-rose-800', amber: 'bg-amber-100 text-amber-800', blue: 'bg-blue-100 text-blue-800', gray: 'bg-slate-100 text-slate-700' };
export const Badge = ({ tone = 'gray', children }) => <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${BADGES[tone]}`}>{children}</span>;
export const statusTone = (s) => ({ Present: 'green', Late: 'amber', Absent: 'red', approved: 'green', pending: 'amber', rejected: 'red', Signed: 'green', Pending: 'amber' }[s] || 'gray');

export const Btn = ({ variant = 'primary', className = '', ...p }) => {
  const v = { primary: 'bg-blue-600 text-white hover:bg-blue-700', danger: 'bg-rose-600 text-white hover:bg-rose-700', ghost: 'bg-slate-100 text-slate-700 hover:bg-slate-200', ok: 'bg-emerald-600 text-white hover:bg-emerald-700' }[variant];
  return <button {...p} className={`rounded-lg px-4 py-2 text-xs font-bold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`} />;
};

export const PasswordInput = ({ label, className = '', ...p }) => {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      {label && <span className="block text-xs font-bold text-slate-700 mb-1">{label}</span>}
      <span className="relative block">
        <input
          {...p}
          type={visible ? 'text' : 'password'}
          className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-11 text-sm transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-r-xl"
        >
          {visible ? (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.1 9.5 7-.4 1.2-1.2 2.4-2.3 3.5M6.2 6.2C4.2 7.5 2.9 9.5 2.5 12c1 2.9 4.5 7 9.5 7 1.3 0 2.5-.3 3.6-.8" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          )}
        </button>
      </span>
    </label>
  );
};

export const Input = ({ label, className = '', type, ...p }) => {
  if (type === 'password') return <PasswordInput label={label} className={className} {...p} />;
  return (
    <label className="block">
      {label && <span className="block text-xs font-bold text-slate-700 mb-1">{label}</span>}
      <input {...p} type={type} className={`w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 ${className}`} />
    </label>
  );
};

// columns: [{ key, label, render?(row) }]
export function Table({ columns, rows, empty = 'Nothing to show yet.', searchable = false, pageSize }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: '', direction: 'asc' });
  const [page, setPage] = useState(0);

  if (!rows.length) return <Card className="py-10 text-center"><span aria-hidden="true" className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-800"><Icon name="inbox" className="h-5 w-5" /></span><p className="text-sm font-semibold text-slate-700">{empty}</p><p className="mt-1 text-xs text-slate-500">Try adjusting your filters or check back later.</p></Card>;

  const term = query.trim().toLocaleLowerCase();
  const filteredRows = searchable && term
    ? rows.filter((row) => columns.some((column) => String(row[column.key] ?? '').toLocaleLowerCase().includes(term)))
    : rows;
  const sortedRows = sort.key
    ? [...filteredRows].sort((a, b) => {
      const left = a[sort.key];
      const right = b[sort.key];
      const leftNumber = Number(left);
      const rightNumber = Number(right);
      const result = left != null && right != null && String(left).trim() && String(right).trim() && Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
        ? leftNumber - rightNumber
        : String(left ?? '').localeCompare(String(right ?? ''), undefined, { numeric: true, sensitivity: 'base' });
      return sort.direction === 'asc' ? result : -result;
    })
    : filteredRows;
  const validPageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : sortedRows.length;
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / validPageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = sortedRows.slice(currentPage * validPageSize, (currentPage + 1) * validPageSize);

  return (
    <div className="space-y-3">
      {searchable && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="block w-full max-w-sm">
            <span className="sr-only">Search table</span>
            <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Search these results…" className="w-full px-3 py-2.5 focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </label>
          <p aria-live="polite" className="text-xs text-slate-500">
            {sortedRows.length === 0 ? 'No matching records' : `Showing ${currentPage * validPageSize + 1}–${Math.min((currentPage + 1) * validPageSize, sortedRows.length)} of ${sortedRows.length}`}
          </p>
        </div>
      )}
      {sortedRows.length === 0 ? (
        <Card className="py-8 text-center"><p className="text-sm font-semibold text-slate-700">No matching records.</p><p className="mt-1 text-xs text-slate-500">Try another search term.</p></Card>
      ) : (
        <>
          <div role="region" aria-label="Results table" tabIndex={0} className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-blue-50/80 text-[11px] uppercase tracking-wide text-blue-800">
                <tr>{columns.map((column) => {
                  const canSort = !!column.label;
                  const active = sort.key === column.key;
                  return (
                    <th key={column.key} scope="col" aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="whitespace-nowrap px-4 py-3 text-left font-bold">
                      {canSort ? (
                        <button type="button" onClick={() => { setSort({ key: column.key, direction: active && sort.direction === 'asc' ? 'desc' : 'asc' }); setPage(0); }} className="inline-flex min-h-8 items-center gap-1.5 rounded text-left hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                          {column.label}<span aria-hidden="true" className="text-[10px]">{active ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </button>
                      ) : column.label}
                    </th>
                  );
                })}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((row, index) => (
                  <tr key={row.id ?? row.adm ?? currentPage * validPageSize + index} className="transition-colors hover:bg-blue-50/40">
                    {columns.map((column) => <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-700">{column.render ? column.render(row) : row[column.key]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <nav aria-label="Table pages" className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={currentPage === 0} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
              <span aria-live="polite" className="min-w-20 text-center text-xs tabular-nums text-slate-500">Page {currentPage + 1} of {pageCount}</span>
              <button type="button" onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))} disabled={currentPage >= pageCount - 1} className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

const ICON_PATHS = {
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  ban: 'M6 6l12 12M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z',
  chart: 'M3 3v18h18M8 15l4-4 4 3 5-7',
  check: 'm5 12 4 4L19 6',
  chat: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5Z',
  clipboard: 'M9 4h6l1 2h4v16H4V6h4l1-2Zm-1 7h8m-8 4h8m-8 4h5',
  close: 'm18 6-12 12M6 6l12 12',
  device: 'M5 2h14v20H5zM9 18h6',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8m-8 4h8',
  graduation: 'm2 10 10-5 10 5-10 5-10-5Zm4 3v5c4 3 8 3 12 0v-5m4-3v6',
  history: 'M3 12a9 9 0 1 0 2.6-6.4L3 8m0-5v5h5m4-1v5l3 2',
  inbox: 'M4 4h16l2 10v6H2v-6L4 4Zm-2 10h6l2 3h4l2-3h6',
  install: 'M12 3v12m0 0 5-5m-5 5-5-5M4 17v3h16v-3',
  id: 'M3 5h18v14H3zM8 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm6 1h4m-4 4h4m-12 1a3 3 0 0 1 6 0',
  landmark: 'M3 9h18L12 3 3 9Zm2 3v6m5-6v6m4-6v6m5-6v6M3 21h18',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  megaphone: 'M3 11v2l14 5V6L3 11Zm14-2 4-2v10l-4-2m-9-3 2 8h4l-3-7',
  menu: 'M4 6h16M4 12h16M4 18h16',
  notifications: 'M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4',
  pen: 'm3 17 11-11 4 4L7 21H3v-4Zm10-9 4 4m2-12 3 3',
  printer: 'M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2m-12-4h12v7H6z',
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zm4 4h3v3h-3zm0-4h3',
  radio: 'M4 10a12 12 0 0 1 16 0M7 13a7 7 0 0 1 10 0m-7 3a3 3 0 0 1 4 0m-2 3h.01',
  scan: 'M4 8V4h4m8 0h4v4m0 8v4h-4m-8 0H4v-4M7 12h10',
  school: 'm3 10 9-6 9 6-9 6-9-6Zm3 3v5c4 3 8 3 12 0v-5m3-3v6',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2m9-9h-2M5 12H3m15.4-6.4-1.4 1.4M7 17l-1.4 1.4m12.8 0L17 17M7 7 5.6 5.6',
  support: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-3-13a3 3 0 1 1 5.7 1.3c-.8 1.4-2.7 1.5-2.7 3.7m0 3h.01',
  trophy: 'M8 21h8m-4-4v4m-6-18h12v5a6 6 0 0 1-12 0V3Zm0 2H3v2a5 5 0 0 0 5 5m8-7h5v2a5 5 0 0 1-5 5',
  users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 10v-2a4 4 0 0 0-3-3.9m-1-12.1a4 4 0 0 1 0 7.8',
  warning: 'M12 3 2 21h20L12 3Zm0 7v4m0 3h.01',
};

export function Icon({ name, className = 'h-5 w-5' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={ICON_PATHS[name] || ICON_PATHS.chart} />
    </svg>
  );
}

export const LinkGrid = ({ items, Link }) => (
  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
    {items.map((i) => (
      <Link key={i.to} to={i.to} className={`group flex min-h-32 flex-col rounded-2xl border p-4 shadow-sm shadow-slate-900/[0.03] transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${i.primary ? 'col-span-2 border-blue-700 bg-blue-700 text-white hover:border-blue-800 hover:bg-blue-800 md:col-span-1' : 'border-slate-200 bg-white text-slate-900 hover:bg-blue-50/40'}`}>
        <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${i.primary ? 'bg-white/15 text-white' : 'bg-blue-50 text-blue-800 group-hover:bg-blue-100'}`}>
          <Icon name={i.icon} />
        </span>
        <span className={`text-sm font-bold ${i.primary ? 'text-white' : 'text-slate-900'}`}>{i.label}</span>
        {i.hint && <span className={`mt-1 text-xs leading-5 ${i.primary ? 'text-blue-100' : 'text-slate-500'}`}>{i.hint}</span>}
      </Link>
    ))}
  </div>
);
