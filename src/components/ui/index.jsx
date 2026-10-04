import React from 'react';

export const Page = ({ title, subtitle, actions, children }) => (
  <div className="p-4 md:p-6 space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-black text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions}
    </div>
    {children}
  </div>
);

export const Spinner = () => (
  <div className="flex justify-center p-10"><div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
);

export const ErrorBox = ({ error, onRetry }) => (
  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center justify-between gap-3">
    <span>{error}</span>
    {onRetry && <button onClick={() => onRetry()} className="text-xs font-bold underline shrink-0">Retry</button>}
  </div>
);

export const Notice = ({ kind = 'info', children }) => {
  const tone = { info: 'bg-blue-50 border-blue-200 text-blue-800', ok: 'bg-emerald-50 border-emerald-200 text-emerald-800', warn: 'bg-amber-50 border-amber-200 text-amber-800', error: 'bg-rose-50 border-rose-200 text-rose-700' }[kind];
  return <div className={`p-3 border rounded-xl text-xs font-medium ${tone}`}>{children}</div>;
};

// state = result of useFetch(); children(data) renders once real data has arrived
export function Async({ state, children }) {
  if (state.error) return <ErrorBox error={state.error} onRetry={state.reload} />;
  if (state.loading && state.data == null) return <Spinner />;
  if (state.data == null) return null;
  return children(state.data);
}

export const Card = ({ children, className = '' }) => (
  <div className={`bg-white border border-gray-100 rounded-2xl shadow-sm p-4 ${className}`}>{children}</div>
);

const TONES = { blue: 'text-blue-600', green: 'text-emerald-600', red: 'text-rose-600', amber: 'text-amber-600', gray: 'text-gray-800' };
export const Stat = ({ label, value, tone = 'gray', hint }) => (
  <Card>
    <p className="text-[11px] uppercase font-bold tracking-wide text-gray-500">{label}</p>
    <p className={`text-2xl font-black mt-1 ${TONES[tone]}`}>{value}</p>
    {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
  </Card>
);

const BADGES = { green: 'bg-emerald-100 text-emerald-800', red: 'bg-rose-100 text-rose-800', amber: 'bg-amber-100 text-amber-800', blue: 'bg-blue-100 text-blue-800', gray: 'bg-gray-100 text-gray-700' };
export const Badge = ({ tone = 'gray', children }) => <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${BADGES[tone]}`}>{children}</span>;
export const statusTone = (s) => ({ Present: 'green', Late: 'amber', Absent: 'red', approved: 'green', pending: 'amber', rejected: 'red', Signed: 'green', Pending: 'amber' }[s] || 'gray');

export const Btn = ({ variant = 'primary', className = '', ...p }) => {
  const v = { primary: 'bg-blue-600 text-white hover:bg-blue-700', danger: 'bg-rose-600 text-white hover:bg-rose-700', ghost: 'bg-gray-100 text-gray-700 hover:bg-gray-200', ok: 'bg-emerald-600 text-white hover:bg-emerald-700' }[variant];
  return <button {...p} className={`text-xs font-bold px-4 py-2 rounded-lg transition disabled:opacity-50 ${v} ${className}`} />;
};

export const Input = ({ label, className = '', ...p }) => (
  <label className="block">
    {label && <span className="block text-xs font-bold text-gray-700 mb-1">{label}</span>}
    <input {...p} className={`w-full bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 ${className}`} />
  </label>
);

// columns: [{ key, label, render?(row) }]
export function Table({ columns, rows, empty = 'Nothing to show yet.' }) {
  if (!rows.length) return <Card><p className="text-sm text-gray-500 text-center py-4">{empty}</p></Card>;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
          <tr>{columns.map((c) => <th key={c.key} className="text-left font-bold px-4 py-2.5 whitespace-nowrap">{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={r.id ?? r.adm ?? i} className="hover:bg-gray-50">
              {columns.map((c) => <td key={c.key} className="px-4 py-2.5 whitespace-nowrap">{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const LinkGrid = ({ items, Link }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {items.map((i) => (
      <Link key={i.to} to={i.to} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-blue-300 transition">
        <p className="text-2xl">{i.icon}</p>
        <p className="text-sm font-bold text-gray-900 mt-1">{i.label}</p>
        {i.hint && <p className="text-[11px] text-gray-500">{i.hint}</p>}
      </Link>
    ))}
  </div>
);
