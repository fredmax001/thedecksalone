/**
 * Generic PayPal one-time payment button (PayPal JS SDK v5, Buttons component).
 *
 * Reusable across all platform flows (subscriptions, tickets, bookings, tips):
 * - `createOrder` calls OUR server and resolves with a PayPal orderId
 * - `onCapture` runs after buyer approval; throw to show an error toast,
 *   resolve to show `successMessage`
 *
 * The SDK script is loaded on demand and the button renders nothing (falls
 * back to the manual flow) until PAYPAL_CLIENT_ID/SECRET are configured or if
 * the SDK fails to initialize.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/apiErrors';

declare global {
  interface Window {
    paypal?: any;
  }
}

interface PayPalConfig {
  enabled: boolean;
  clientId: string;
  environment: 'sandbox' | 'live';
  currency: string;
}

interface PayPalButtonProps {
  createOrder: () => Promise<string>;
  onCapture: (orderId: string) => Promise<void>;
  label?: string;
  successMessage?: string;
  className?: string;
}

const scriptPromises = new Map<string, Promise<any>>();

function loadPayPalScript(clientId: string, environment: string): Promise<any> {
  const key = `${environment}:${clientId}`;
  if (window.paypal?.Buttons) return Promise.resolve(window.paypal);
  if (scriptPromises.has(key)) return scriptPromises.get(key)!;

  const promise = new Promise<any>((resolve, reject) => {
    const host = environment === 'sandbox' ? 'www.sandbox.paypal.com' : 'www.paypal.com';
    const src = `https://${host}/sdk/js?client-id=${encodeURIComponent(clientId)}&components=buttons&currency=USD`;
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.paypal));
      existing.addEventListener('error', () => reject(new Error('Failed to load PayPal SDK')));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(window.paypal);
    script.onerror = () => {
      scriptPromises.delete(key);
      reject(new Error('Failed to load PayPal SDK'));
    };
    document.head.appendChild(script);
  });
  scriptPromises.set(key, promise);
  return promise;
}

export default function PayPalButton({
  createOrder,
  onCapture,
  label = 'Pay with PayPal',
  successMessage = 'Payment confirmed!',
  className = '',
}: PayPalButtonProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'disabled'>('loading');
  const containerRef = useRef<HTMLDivElement>(null);
  const createOrderRef = useRef(createOrder);
  createOrderRef.current = createOrder;
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;
  const successRef = useRef(successMessage);
  successRef.current = successMessage;

  useEffect(() => {
    let cancelled = false;
    api
      .get('/payments/paypal/config')
      .then((res) => {
        if (cancelled) return;
        const cfg = res.data?.data as PayPalConfig;
        if (!cfg?.enabled || !cfg.clientId) {
          setStatus('disabled');
          return null;
        }
        return loadPayPalScript(cfg.clientId, cfg.environment);
      })
      .then(async (paypal) => {
        if (cancelled || !paypal) return;
        if (!containerRef.current) return;

        containerRef.current.innerHTML = '';
        const buttons = paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'paypal',
            height: 45,
          },
          // Create the order on OUR server (amount converted SLE→USD there)
          createOrder: () => createOrderRef.current(),
          onApprove: async (data: { orderID: string }) => {
            try {
              await onCaptureRef.current(data.orderID);
              toast.success(successRef.current);
            } catch (err) {
              toast.error(getApiErrorMessage(err, 'Payment capture failed'));
            }
          },
          onCancel: () => {
            toast('Payment cancelled');
          },
          onError: (err: any) => {
            console.error('[PayPal] checkout error:', err);
            toast.error(err?.message || 'PayPal encountered an error');
          },
        });

        if (!buttons.isEligible()) {
          throw new Error('PayPal is not eligible on this device');
        }
        await buttons.render(containerRef.current);
        if (!cancelled) setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[PayPal] init error:', err);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'disabled' || status === 'error') return null; // manual flow remains

  return (
    <div className={className}>
      {status === 'loading' && (
        <button
          type="button"
          disabled
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#FFC439] text-[#003087] font-bold text-sm py-3 opacity-60 cursor-not-allowed"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading PayPal…
        </button>
      )}
      {label && <p className="text-[11px] text-text-muted text-center mt-2">{label}</p>}
      <div ref={containerRef} className={status === 'loading' ? 'hidden' : ''} />
    </div>
  );
}
