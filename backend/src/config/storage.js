import path from 'node:path';

export const STORAGE_ROOT = path.resolve(process.env.STORAGE_ROOT || process.cwd());
export const UPLOAD_DIR = path.join(STORAGE_ROOT, 'uploads');
export const TIMETABLE_DIR = path.join(STORAGE_ROOT, 'storage', 'timetables');
