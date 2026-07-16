import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/browser';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

interface ScanResult {
  message: string;
  user?: { name: string; username: string; avatar: string };
  scannedAt?: string;
  error?: string;
}

export default function TicketScanner() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastScanned = useRef<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopCamera = useCallback(() => {
    if (readerRef.current) {
      // @ts-ignore
      readerRef.current.reset?.();
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const processQrCode = useCallback(
    async (code: string) => {
      if (isProcessing || lastScanned.current === code) return;
      lastScanned.current = code;
      setIsProcessing(true);

      try {
        const res = await api.post(`/events/${eventId}/tickets/scan`, { qrCode: code });
        setScanState('success');
        setResult({ message: res.data.message, user: res.data.data?.user, scannedAt: res.data.data?.scannedAt });
      } catch (err: any) {
        const errCode = err.response?.data?.error;
        const errMsg = err.response?.data?.message || err.message;
        setScanState('error');
        setResult({ message: errMsg, error: errCode });
      } finally {
        setIsProcessing(false);
        // Auto-reset to scanning after 3 seconds
        cooldownRef.current = setTimeout(() => {
          lastScanned.current = null;
          setScanState('scanning');
          setResult(null);
        }, 3500);
      }
    },
    [eventId, isProcessing]
  );

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScanState('scanning');
    setResult(null);
    lastScanned.current = null;

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      await reader.decodeFromVideoDevice(
        undefined, // use default camera (back on mobile)
        videoRef.current!,
        (result, error) => {
          if (result) {
            processQrCode(result.getText());
          }
          if (error && !(error instanceof NotFoundException)) {
            console.warn('Scan error:', error);
          }
        }
      );
    } catch (err: any) {
      setCameraError(err.message || 'Could not access camera. Please allow camera permissions.');
      setScanState('idle');
    }
  }, [processQrCode]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  const handleReset = () => {
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    lastScanned.current = null;
    setScanState('scanning');
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-3 border-b border-white/10">
        <button
          onClick={() => { stopCamera(); navigate(-1); }}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-white/50 uppercase tracking-wider">Deck Salone</p>
          <h1 className="text-white font-bold text-lg leading-tight">Ticket Scanner</h1>
        </div>
        <QrCode className="w-6 h-6 text-gold" />
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        {/* Video */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Overlay: Scanner Frame */}
        {scanState === 'scanning' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Darkened outside */}
            <div className="absolute inset-0 bg-black/50" style={{ mask: 'radial-gradient(ellipse 220px 220px at center, transparent 0, black 100%)' }} />
            {/* Corner brackets */}
            <div className="relative w-56 h-56">
              <span className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-gold rounded-tl-lg" style={{ borderWidth: '3px', borderRightColor: 'transparent', borderBottomColor: 'transparent' }} />
              <span className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-gold rounded-tr-lg" style={{ borderWidth: '3px', borderLeftColor: 'transparent', borderBottomColor: 'transparent' }} />
              <span className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-gold rounded-bl-lg" style={{ borderWidth: '3px', borderRightColor: 'transparent', borderTopColor: 'transparent' }} />
              <span className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-gold rounded-br-lg" style={{ borderWidth: '3px', borderLeftColor: 'transparent', borderTopColor: 'transparent' }} />
              {/* Scan line animation */}
              <motion.div
                className="absolute left-2 right-2 h-0.5 bg-gold/80"
                animate={{ top: ['8px', '216px', '8px'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <p className="absolute bottom-[28%] text-white/60 text-sm text-center">
              Point camera at ticket QR code
            </p>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <Loader2 className="w-10 h-10 text-gold animate-spin" />
          </div>
        )}

        {/* Camera error */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black px-8 text-center">
            <Camera className="w-12 h-12 text-white/30" />
            <p className="text-white/60 text-sm">{cameraError}</p>
            <button
              onClick={startCamera}
              className="flex items-center gap-2 px-5 py-2.5 bg-gold text-black rounded-xl font-semibold text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Result Panel */}
      <AnimatePresence>
        {(scanState === 'success' || scanState === 'error') && result && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className={`absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 pb-safe shadow-2xl ${
              scanState === 'success' ? 'bg-green-950 border-t border-green/30' : 'bg-red-950 border-t border-red-500/30'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                scanState === 'success' ? 'bg-green/20' : 'bg-red-500/20'
              }`}>
                {scanState === 'success' ? (
                  <CheckCircle2 className="w-8 h-8 text-green" />
                ) : result.error === 'ALREADY_SCANNED' ? (
                  <AlertCircle className="w-8 h-8 text-yellow-400" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`font-bold text-lg ${scanState === 'success' ? 'text-green' : 'text-red-300'}`}>
                  {scanState === 'success' ? '✅ Entry Granted' :
                   result.error === 'ALREADY_SCANNED' ? '⚠️ Already Scanned' :
                   result.error === 'WRONG_EVENT' ? '🚫 Wrong Event' :
                   '❌ Invalid Ticket'}
                </p>
                <p className="text-white/70 text-sm mt-1">{result.message}</p>
                {result.user && (
                  <div className="mt-3 flex items-center gap-2">
                    {result.user.avatar ? (
                      <img src={result.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white">
                        {result.user.name?.[0] || '?'}
                      </div>
                    )}
                    <div>
                      <p className="text-white font-semibold text-sm">{result.user.name || result.user.username}</p>
                      <p className="text-white/50 text-xs">@{result.user.username}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleReset}
              className="mt-4 w-full py-3 rounded-xl bg-white/10 text-white font-semibold text-sm"
            >
              Scan Next Ticket
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
