import React from 'react';

export default function DepartmentClassFilters({ classes, department, classCode, onDepartmentChange, onClassChange }) {
  const departments = [...new Set(classes.map((item) => String(item.department || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const filteredClasses = department
    ? classes.filter((item) => item.department === department)
    : classes;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="block w-full max-w-sm">
        <span className="mb-1 block text-xs font-bold text-gray-700">Department</span>
        <select value={department} onChange={(event) => onDepartmentChange(event.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
          <option value="">All departments</option>
          {departments.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="block w-full max-w-sm">
        <span className="mb-1 block text-xs font-bold text-gray-700">Class</span>
        <select value={classCode} onChange={(event) => onClassChange(event.target.value)} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
          <option value="">All classes</option>
          {filteredClasses.map((item) => <option key={item.code} value={item.code}>{item.code}</option>)}
        </select>
      </label>
    </div>
  );
}
