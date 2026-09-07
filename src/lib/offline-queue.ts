import api from './api';
import { toast } from 'sonner';
import { queryClient } from './queryClient';

/**
 * Offline write queue — walk-in ticket sales only.
 *
 * Venue Wi-Fi dies mid-sale: the sale is serialized here (localStorage) with a
 * client-generated idempotency key, shown to door staff as "queued", and
 * replayed in order when connectivity returns. The backend stores the key on
 * the created ticket and returns the original ticket on replay, so a flaky
 * connection can never turn one sale into two.
 */

export interface WalkinPayload {
  ticketTypeId: string;
  quantity: number;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  paymentMethod: 'cash' | 'complimentary' | 'mobile_money';
  amount?: number;
  notes?: string;
}

export interface QueuedWalkin {
  id: string;
  kind: 'walkin';
  eventId: string;
  idempotencyKey: string; // same key across retries of the SAME logical sale
  payload: WalkinPayload;
  createdAt: number;
  state: 'queued' | 'syncing' | 'rejected';
  error?: string;
}

const STORAGE_KEY = 'decksalone-offline-queue';
const MAX_QUEUE = 20; // cap so a long outage can't grow the queue forever
const QUEUE_CHANGED_EVENT = 'decksalone-offline-queue-changed';

export function isNetworkError(error: any): boolean {
  if (!error) return false;
  // axios: no `response` means the request never got an HTTP answer
  // (offline, DNS failure, timeout, connection reset). Server rejections
  // always carry a response and must NOT be queued.
  if (error.response) return false;
  return true;
}

export function getWalkinQueue(): QueuedWalkin[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((i) => i?.kind === 'walkin') : [];
  } catch {
    return [];
  }
}

function saveQueue(items: QueuedWalkin[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full / unavailable — the sale stays unsent; caller toasts
  }
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
}

export function getQueuedWalkinsForEvent(eventId: string): QueuedWalkin[] {
  return getWalkinQueue().filter((i) => i.eventId === eventId);
}

export function enqueueWalkinSale(eventId: string, payload: WalkinPayload, idempotencyKey: string) {
  const queue = getWalkinQueue();
  const item: QueuedWalkin = {
    id: crypto.randomUUID(),
    kind: 'walkin',
    eventId,
    idempotencyKey,
    payload,
    createdAt: Date.now(),
    state: 'queued',
  };
  queue.unshift(item);
  let dropped: QueuedWalkin | undefined;
  const overflow = queue.length - MAX_QUEUE;
  if (overflow > 0) {
    // drop the oldest still-queued entries first; never silently drop rejected ones
    for (let i = queue.length - 1; i >= 0 && overflow > 0; i--) {
      if (queue[i].state === 'queued') {
        dropped = queue.splice(i, 1)[0];
      }
    }
  }
  saveQueue(queue);
  if (dropped) {
    toast.error(
      `Offline queue full — oldest queued sale (${dropped.payload.buyerName}) was removed. Resolve it manually.`
    );
  }
  return item;
}

export function removeQueueItem(id: string) {
  saveQueue(getWalkinQueue().filter((i) => i.id !== id));
}

export function updateQueueItem(id: string, patch: Partial<QueuedWalkin>) {
  saveQueue(getWalkinQueue().map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

export function subscribeToQueueChanges(callback: () => void): () => void {
  window.addEventListener(QUEUE_CHANGED_EVENT, callback);
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener(QUEUE_CHANGED_EVENT, callback);
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnsiteToken(eventId: string): string | null {
  try {
    return sessionStorage.getItem(`onsite_token_${eventId}`);
  } catch {
    return null;
  }
}

function invalidateOnsite(eventId: string) {
  queryClient.invalidateQueries({ queryKey: ['onsite-guests', eventId] });
  queryClient.invalidateQueries({ queryKey: ['onsite-dashboard', eventId] });
  queryClient.invalidateQueries({ queryKey: ['event-availability', eventId] });
  queryClient.invalidateQueries({ queryKey: ['event-dashboard', eventId] });
}

let draining = false;

/**
 * Replays queued sales in order. Safe to call repeatedly; runs one pass at a
 * time. Items the server rejects are kept in 'rejected' state with the server
 * message — they are never silently dropped, so staff can reconcile cash
 * taken against tickets actually issued.
 */
export async function drainWalkinQueue(): Promise<void> {
  if (draining) return;
  const pending = getWalkinQueue().filter((i) => i.state === 'queued');
  if (pending.length === 0) return;

  draining = true;
  try {
    for (const item of pending) {
      const token = getOnsiteToken(item.eventId);
      if (!token) {
        // Staff session expired (sessionStorage doesn't survive app restarts).
        // Leave queued; the next successful drain after re-login will pick it up.
        continue;
      }
      updateQueueItem(item.id, { state: 'syncing' });
      try {
        const res = await api.post(
          `/events/${item.eventId}/ticketing/onsite/walkin`,
          { ...item.payload, idempotencyKey: item.idempotencyKey },
          { headers: { 'X-Onsite-Token': token } }
        );
        if (res.data?.success) {
          saveQueue(getWalkinQueue().filter((i) => i.id !== item.id));
          invalidateOnsite(item.eventId);
          toast.success(`Queued sale synced: ${item.payload.buyerName}`);
        }
      } catch (err: any) {
        if (isNetworkError(err)) {
          // still offline — put it back and stop this pass
          updateQueueItem(item.id, { state: 'queued' });
          return;
        }
        // Server answered and refused the sale (sold out, event closed, ...).
        // Keep it visible for reconciliation — this is cash-in-hand.
        updateQueueItem(item.id, {
          state: 'rejected',
          error: err?.response?.data?.error || 'Server rejected the sale',
        });
        toast.error(
          `Queued sale for ${item.payload.buyerName} was rejected: ${err?.response?.data?.error || 'see queue'}`
        );
      }
    }
  } finally {
    draining = false;
  }
}

/** Call once at app start: sync when connectivity returns. */
export function initOfflineQueue() {
  window.addEventListener('online', () => {
    drainWalkinQueue();
  });
  // Best-effort initial drain (e.g. app reopened while online)
  if (navigator.onLine) {
    drainWalkinQueue();
  }
}
