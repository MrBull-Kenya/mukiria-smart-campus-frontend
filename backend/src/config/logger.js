import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { once } from 'node:events';

const LOG_FILE_PATTERN = /^backend-(\d{4}-\d{2}-\d{2})\.log$/;

function logDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export async function initializeFileLogging() {
  const logDir = path.resolve(process.env.LOG_DIR || path.join(process.env.STORAGE_ROOT || process.cwd(), 'logs'));
  const retentionDays = Number.parseInt(process.env.LOG_RETENTION_DAYS || '14', 10);
  await fs.promises.mkdir(logDir, { recursive: true });

  if (Number.isFinite(retentionDays) && retentionDays > 0) {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const entries = await fs.promises.readdir(logDir, { withFileTypes: true });
    await Promise.all(entries.filter((entry) => {
      const match = entry.isFile() && entry.name.match(LOG_FILE_PATTERN);
      return match && Date.parse(`${match[1]}T00:00:00.000Z`) < cutoff;
    }).map((entry) => fs.promises.unlink(path.join(logDir, entry.name))));
  }

  const original = Object.fromEntries(['log', 'info', 'warn', 'error'].map((level) => [level, console[level].bind(console)]));
  let activeDate = logDate();
  let stream = fs.createWriteStream(path.join(logDir, `backend-${activeDate}.log`), { flags: 'a' });
  await once(stream, 'open');

  const disableFileLogging = (source, err) => {
    if (stream !== source) return;
    stream = null;
    for (const [level, write] of Object.entries(original)) console[level] = write;
    original.error('[logger] File logging stopped; continuing with console output only:', err);
  };

  const attachStreamError = (target) => target.on('error', (err) => disableFileLogging(target, err));
  attachStreamError(stream);

  for (const level of Object.keys(original)) {
    console[level] = (...args) => {
      original[level](...args);
      if (!stream) return;

      const now = new Date();
      const date = logDate(now);
      if (date !== activeDate) {
        stream.end();
        activeDate = date;
        stream = fs.createWriteStream(path.join(logDir, `backend-${activeDate}.log`), { flags: 'a' });
        attachStreamError(stream);
      }

      stream.write(`[${now.toISOString()}] [${level.toUpperCase()}] ${util.format(...args)}\n`);
    };
  }

  return logDir;
}
