'use client';

import { useSyncExternalStore } from 'react';

/**
 * A tiny publish/subscribe store backing the console's single Flashbar.
 *
 * Mutations publish from anywhere; the shell renders. A full state library
 * would be more machinery than one array of messages justifies.
 */

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  header: string;
  content?: string;
}

let notifications: Notification[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  // A new array identity is required: useSyncExternalStore compares snapshots
  // by reference and would not re-render if the array were mutated in place.
  notifications = [...notifications];
  listeners.forEach((listener) => listener());
}

/** Adds a notification and returns its identifier. */
export function notify(
  type: NotificationType,
  header: string,
  content?: string,
): string {
  const id = crypto.randomUUID();
  notifications = [...notifications, { id, type, header, content }];
  emit();

  // Successes are transient; failures stay until the user dismisses them,
  // because an error the user missed is an error they cannot act on.
  if (type === 'success' || type === 'info') {
    setTimeout(() => dismissNotification(id), 5000);
  }
  return id;
}

/** Removes one notification by identifier. */
export function dismissNotification(id: string): void {
  notifications = notifications.filter((item) => item.id !== id);
  emit();
}

/** Removes every notification, used when navigating away from a flow. */
export function clearNotifications(): void {
  notifications = [];
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Notification[] {
  return notifications;
}

function getServerSnapshot(): Notification[] {
  return [];
}

/** Subscribes a component to the current notification list. */
export function useNotifications(): Notification[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
