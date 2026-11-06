import { useEffect, useRef } from 'react';
import { useStore } from './data/store';
import { TASK_LABEL } from './core/defaults';
import { time } from './core/format';

export async function askNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

async function notify(title: string, body: string) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, icon: './icon-192.png', badge: './favicon.png', tag: title + body });
      return;
    }
  } catch {
    /* cai para a notificação simples */
  }
  if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body });
}

/**
 * Lembretes da agenda. Disparam enquanto o app está aberto ou em segundo plano recente;
 * sem servidor, o navegador não acorda um app fechado.
 */
export function useReminders() {
  const { tasks, leads, saveTask, ready } = useStore();
  const ref = useRef({ tasks, leads, saveTask });
  ref.current = { tasks, leads, saveTask };

  useEffect(() => {
    if (!ready) return;
    const check = () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const now = Date.now();
      for (const t of ref.current.tasks) {
        if (t.done || t.notified || t.reminderMin <= 0) continue;
        const at = new Date(t.date).getTime();
        if (now >= at - t.reminderMin * 60000 && now < at + 60 * 60000) {
          const lead = ref.current.leads.find((l) => l.id === t.leadId);
          const d = new Date(t.date);
          notify(`${TASK_LABEL[t.type]} às ${time(d)}`, [lead?.name, t.notes].filter(Boolean).join(' — '));
          ref.current.saveTask({ ...t, notified: true });
        }
      }
    };
    check();
    const id = setInterval(check, 30000);
    const onVis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ready]);
}
