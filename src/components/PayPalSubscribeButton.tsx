/**
 * PayPal one-time payment button for Pro/Pro+ subscriptions (PayPal JS SDK v6).
 *
 * The SDK script is loaded on demand, an order is created on OUR server
 * (amount converted SLE→USD), and the buyer approves in PayPal's popup.
 * On approval we call our capture endpoint, which activates the subscription.
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

interface Props {
  plan: 'pro' | 'legend';
  billingPeriod: 'monthly' | 'annual';
  onSuccess: (plan: string) => void | Promise<void>;
}

const scriptPromises = new Map<string, Promise<any>>();

function loadPayPalScript(clientId: string, environment: string): Promise<any> {
  const key = `${environment}:${clientId}`;
  if (window.paypal?.createInstance) return Promise.resolve(window.paypal);
  if (scriptPromises.has(key)) return scriptPromises.get(key)!;

  const promise = new Promise<any>((resolve, reject) => {
    const host = environment === 'sandbox' ? 'www.sandbox.paypal.com' : 'www.paypal.com';
    const src = `https://${host}/sdk/js?client-id=${encodeURIComponent(clientId)}&components=paypal-payments&currency=USD`;
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

export default function PayPalSubscribeButton({ plan, billingPeriod, onSuccess }: Props) {
  const [config, setConfig] = useState<PayPalConfig | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'disabled'>('loading');
  const [starting, setStarting] = useState(false);
  const sessionRef = useRef<any>(null);
  const configRef = useRef<PayPalConfig | null>(null);
  configRef.current = config;

  useEffect(() => {
    let cancelled = false;
    api
      .get('/payments/paypal/config')
      .then((res) => {
        if (cancelled) return;
        const cfg = res.data?.data as PayPalConfig;
        if (!cfg?.enabled || !cfg.clientId) {
          setConfig(null);
          setStatus('disabled');
          return;
        }
        setConfig(cfg);
        setStatus('loading');
        return loadPayPalScript(cfg.clientId, cfg.environment);
      })
      .then(async (paypal) => {
        if (cancelled || !paypal) return;
        const sdkInstance = await paypal.createInstance({
          clientId: configRef.current!.clientId,
          components: ['paypal-payments'],
        });
        const eligibleMethods = await sdkInstance.findEligibleMethods();
        const paypalMethod = eligibleMethods?.find((m: any) => m.name === 'paypal');
        if (!paypalMethod) throw new Error('PayPal is not eligible on this device');
        sessionRef.current = paypalMethod.createPayPalOneTimePaymentSession({
          onApprove: async ({ orderId }: { orderId: string }) => {
            try {
              const res = await api.post('/payments/paypal/capture-order', { orderId });
              if (res.data?.success) {
                toast.success('🎉 Payment confirmed! Your subscription is now active.');
                await onSuccess(res.data.data?.plan || plan);
              } else {
                toast.error(res.data?.error || 'Payment capture failed');
              }
            } catch (err) {
              toast.error(getApiErrorMessage(err, 'Payment capture failed'));
            } finally {
              setStarting(false);
            }
          },
          onCancel: () => {
            setStarting(false);
            toast('Payment cancelled');
          },
          onError: (err: any) => {
            setStarting(false);
            toast.error(err?.message || 'PayPal encountered an error');
          },
        });
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

  const handleClick = async () => {
    if (!sessionRef.current || starting) return;
    setStarting(true);
    try {
      await sessionRef.current.start({ presentationMode: 'popup' }, () =>
        api
          .post('/payments/paypal/create-order', { plan, billingPeriod })
          .then((res) => ({ orderId: res.data.data.orderId }))
          .catch((err) => {
            setStarting(false);
            throw new Error(getApiErrorMessage(err, 'Could not create the order'));
          })
      );
    } catch (err: any) {
      setStarting(false);
      toast.error(err?.message || 'Could not start PayPal checkout');
    }
  };

  if (status === 'disabled') return null;
  if (status === 'error') return null; // PayPal unavailable — Orange Money flow remains

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={status !== 'ready' || starting}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#FFC439] hover:bg-[#f2b62e] text-[#003087] font-bold text-sm py-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status !== 'ready' || starting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {starting ? 'Opening PayPal…' : 'Loading PayPal…'}
          </>
        ) : (
          <>
            <PayPalMark />
            Pay with PayPal
          </>
        )}
      </button>
      <p className="text-[11px] text-text-muted mt-2 text-center">
        Instant activation · charged in USD · secure PayPal checkout
      </p>
    </div>
  );
}

function PayPalMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.1 21.5H4.2c-.3 0-.5-.3-.5-.6L6 3.7c0-.3.3-.5.5-.5h6.9c2.2 0 3.8.6 4.6 1.7.5.7.7 1.5.6 2.4-.3 2.8-2.3 4.4-5.2 4.4h-2.4c-.3 0-.5.2-.6.5l-1.2 8c0 .3-.3.6-.6.6h-1.5z"
        fill="#003087"
      />
      <path
        d="M19.4 8.1c.2 1 .1 2.2-.4 3.3-.9 2-2.7 3-5.2 3h-1.6c-.2 0-.4.2-.4.4l-1 6.3c0 .2-.2.4-.4.4H6.9l-.1-.5 1.2-7.5c0-.3.3-.5.6-.5h2.4c2.9 0 4.9-1.6 5.2-4.4.1-.8 0-1.5-.4-2.1.7.2 1.2.5 1.6 1l.1.1z"
        fill="#009CDE"
      />
    </svg>
  );
}
