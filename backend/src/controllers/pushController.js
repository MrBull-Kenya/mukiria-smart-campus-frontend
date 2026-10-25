import crypto from 'node:crypto';
import webPush from 'web-push';
import { q, exec } from '../utils/dbHelpers.js';

const vapidConfig = () => ({
  publicKey: process.env.VAPID_PUBLIC_KEY?.trim() || '',
  privateKey: process.env.VAPID_PRIVATE_KEY?.trim() || '',
  subject: process.env.VAPID_SUBJECT?.trim() || '',
});

const isConfigured = ({ publicKey, privateKey, subject }) => !!(publicKey && privateKey && subject);
const PUSH_PROVIDER_HOSTS = [
  'fcm.googleapis.com',
  'push.services.mozilla.com',
  'push.services.opera.com',
  'web.push.apple.com',
];
const endpointHash = (endpoint) => crypto.createHash('sha256').update(endpoint).digest('hex');
const isDuplicate = (err) => err?.code === 'ER_DUP_ENTRY' || err?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
  /unique constraint failed/i.test(err?.message || '');

function configureWebPush(config) {
  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
}

async function rememberNotification(endpoint, id) {
  try {
    await exec('INSERT INTO push_deliveries (endpoint_hash, notification_id) VALUES (?, ?)', [endpoint, id]);
  } catch (err) {
    if (!isDuplicate(err)) throw err;
  }
}

async function currentNotifications(user) {
  const { buildNotificationItems } = await import('./appController.js');
  return buildNotificationItems(user);
}

export const pushController = {
  vapidPublicKey(req, res) {
    const config = vapidConfig();
    res.json({ enabled: isConfigured(config), publicKey: config.publicKey || null });
  },

  async subscribe(req, res) {
    const config = vapidConfig();
    if (!isConfigured(config)) return res.status(503).json({ error: 'Background notifications are not configured on the server yet.' });

    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const subscription = body.subscription || body;
    const endpoint = typeof subscription?.endpoint === 'string' ? subscription.endpoint : '';
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    let parsedEndpoint;
    try {
      parsedEndpoint = new URL(endpoint);
    } catch {
      return res.status(400).json({ error: 'The push subscription endpoint is invalid.' });
    }
    const trustedProvider = PUSH_PROVIDER_HOSTS.some((host) => parsedEndpoint.hostname === host || parsedEndpoint.hostname.endsWith(`.${host}`))
      || parsedEndpoint.hostname.endsWith('.notify.windows.com');
    if (parsedEndpoint.protocol !== 'https:' || (parsedEndpoint.port && parsedEndpoint.port !== '443') ||
      !trustedProvider || endpoint.length > 4096 ||
      typeof p256dh !== 'string' || p256dh.length > 255 ||
      typeof auth !== 'string' || auth.length > 255) {
      return res.status(400).json({ error: 'The push subscription is incomplete or invalid.' });
    }

    const hash = endpointHash(endpoint);
    const existing = await q('SELECT endpoint_hash, baseline_complete FROM push_subscriptions WHERE endpoint_hash = ?', [hash]);
    if (existing.length) {
      await exec(
        'UPDATE push_subscriptions SET user_id = ?, endpoint = ?, p256dh = ?, auth = ? WHERE endpoint_hash = ?',
        [req.user.id, endpoint, p256dh, auth, hash]
      );
    } else {
      try {
        await exec(
          'INSERT INTO push_subscriptions (endpoint_hash, user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?)',
          [hash, req.user.id, endpoint, p256dh, auth]
        );
      } catch (err) {
        if (!isDuplicate(err)) throw err;
        await exec(
          'UPDATE push_subscriptions SET user_id = ?, endpoint = ?, p256dh = ?, auth = ? WHERE endpoint_hash = ?',
          [req.user.id, endpoint, p256dh, auth, hash]
        );
      }
    }

    if (!existing.length || !existing[0].baseline_complete) {
      const initialItems = await currentNotifications(req.user);
      const suppliedIds = Array.isArray(body.knownNotificationIds)
        ? body.knownNotificationIds.filter((id) => typeof id === 'string' && id.length <= 190).slice(0, 100)
        : [];
      for (const id of new Set([...initialItems.map((item) => item.id), ...suppliedIds])) {
        await rememberNotification(hash, id);
      }
      await exec('UPDATE push_subscriptions SET baseline_complete = 1 WHERE endpoint_hash = ?', [hash]);
    }
    res.status(201).json({ message: 'Background notifications enabled on this device.' });
  },

  async unsubscribe(req, res) {
    const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
    if (!endpoint || endpoint.length > 4096) return res.status(400).json({ error: 'A valid push subscription endpoint is required.' });
    await exec(
      'DELETE FROM push_subscriptions WHERE endpoint_hash = ? AND user_id = ?',
      [endpointHash(endpoint), req.user.id]
    );
    res.json({ message: 'Background notifications disabled on this device.' });
  },
};

let polling = false;

export async function pollPushNotifications() {
  if (polling) return;
  polling = true;
  try {
    const config = vapidConfig();
    if (!isConfigured(config)) return;

    const subscriptions = await q(
      `SELECT p.endpoint_hash, p.user_id, p.endpoint, p.p256dh, p.auth, p.baseline_complete,
        u.role, u.class_code, s.adm_no
       FROM push_subscriptions p JOIN users u ON u.id = p.user_id
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.status = 'active'`
    );
    if (!subscriptions.length) return;

    configureWebPush(config);
    const notificationCache = new Map();
    let delivered = 0;
    for (const subscription of subscriptions) {
      const userId = String(subscription.user_id);
      try {
        if (!notificationCache.has(userId)) {
          notificationCache.set(userId, await currentNotifications({
            id: subscription.user_id,
            role: subscription.role,
            class_code: subscription.class_code,
            adm_no: subscription.adm_no,
          }));
        }
      } catch (err) {
        console.error(`Could not build background notifications for user ${userId}:`, err);
        continue;
      }
      const items = notificationCache.get(userId);
      if (!subscription.baseline_complete) {
        for (const item of items) await rememberNotification(subscription.endpoint_hash, item.id);
        await exec('UPDATE push_subscriptions SET baseline_complete = 1 WHERE endpoint_hash = ?', [subscription.endpoint_hash]);
        continue;
      }

      const activeIds = new Set(items.map((item) => item.id));
      const previous = await q('SELECT notification_id FROM push_deliveries WHERE endpoint_hash = ?', [subscription.endpoint_hash]);
      const knownIds = new Set(previous.map((row) => row.notification_id));
      for (const knownId of knownIds) {
        if (!activeIds.has(knownId)) {
          await exec('DELETE FROM push_deliveries WHERE endpoint_hash = ? AND notification_id = ?', [subscription.endpoint_hash, knownId]);
          knownIds.delete(knownId);
        }
      }

      for (const item of items) {
        if (knownIds.has(item.id)) continue;
        try {
          await webPush.sendNotification({
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          }, JSON.stringify({
            title: item.title,
            body: item.text.slice(0, 240),
            url: item.link || '/',
            tag: item.id,
          }));
          await rememberNotification(subscription.endpoint_hash, item.id);
          knownIds.add(item.id);
          delivered++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await exec('DELETE FROM push_subscriptions WHERE endpoint_hash = ?', [subscription.endpoint_hash]);
            break;
          }
          console.error(`Web Push delivery failed for notification ${item.id} (HTTP ${err.statusCode || 'unknown'}).`);
        }
      }
    }
    if (delivered) console.info(`Background notifications delivered: ${delivered}.`);
  } catch (err) {
    console.error('Background notification polling failed:', err);
  } finally {
    polling = false;
  }
}

export function startPushNotificationPolling(intervalMs = 60000) {
  void pollPushNotifications();
  const timer = setInterval(() => void pollPushNotifications(), intervalMs);
  timer.unref?.();
  return timer;
}
