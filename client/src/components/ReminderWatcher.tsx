import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { usePreferences } from '../providers/PreferencesProvider';

const SEEN_KEY = 'grc.reminders.seen';

function seenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markSeen(ids: string[]) {
  const set = seenIds();
  for (const id of ids) set.add(id);
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-80)));
}

export function ReminderWatcher() {
  const { preferences } = usePreferences();
  const fired = useRef(false);

  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!preferences?.browserNotifications) return;
    if (!dashboard.data?.reminders?.length) return;
    if (typeof Notification === 'undefined') return;
    if (fired.current) return;

    const run = async () => {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission !== 'granted') return;

      const seen = seenIds();
      const fresh = dashboard.data!.reminders.filter((r) => {
        const key = `${r.type}:${r.gameId}:${r.date}`;
        return !seen.has(key);
      });
      if (fresh.length === 0) return;

      fired.current = true;
      const first = fresh[0]!;
      const body =
        first.type === 'payment'
          ? `Pago pendiente de «${first.title}» en ${first.daysRemaining} día(s)`
          : `«${first.title}» sale en ${first.daysRemaining} día(s)`;

      try {
        new Notification('Game Release Calendar', {
          body: fresh.length > 1 ? `${body} · +${fresh.length - 1} más` : body,
          tag: 'grc-reminder',
        });
      } catch {
        // ignore blocked notifications
      }

      markSeen(fresh.map((r) => `${r.type}:${r.gameId}:${r.date}`));
    };

    void run();
  }, [preferences?.browserNotifications, dashboard.data]);

  return null;
}
