// ─────────────────────────────────────────────────────────────
// The device half of notifications: permission, scheduling, cancelling.
//
// The message and its timing come from notificationPlan.js (pure, tested).
// This file only talks to the OS, and every call degrades rather than
// throws — a build without expo-notifications, or a person who declined
// permission, simply gets silence.
// ─────────────────────────────────────────────────────────────

import * as Notifications from 'expo-notifications';
import { planNotification, nextFireTime } from './notificationPlan';

export async function ensurePermission() {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.status === 'granted';
  } catch (e) {
    return false;
  }
}

// Rebuild the schedule from scratch: cancel everything, then place at most
// one message. Called when the app backgrounds and when settings change, so
// a stale reminder can never outlive the reason for it.
export async function refreshSchedule({ state, review, daily, now = Date.now() }) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const notify = (state.settings && state.settings.notify) || {};
    if (!notify.enabled) return { scheduled: false, reason: 'off' };
    if (!(await ensurePermission())) return { scheduled: false, reason: 'denied' };

    const message = planNotification({ state, review, daily, now: nextFireTime(notify, now) });
    if (!message) return { scheduled: false, reason: 'nothing-to-say' };

    await Notifications.scheduleNotificationAsync({
      content: { title: message.title, body: message.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(nextFireTime(notify, now)) },
    });
    return { scheduled: true, id: message.id };
  } catch (e) {
    return { scheduled: false, reason: 'error' };
  }
}
