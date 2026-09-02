import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Camera, CheckCircle2, XCircle, AlertCircle, Loader2,
  RefreshCw, User, Ticket, Clock, MapPin,
  SwitchCamera, Keyboard, Send
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/dateTime';

type ScanState = 'idle' | 'scanning' | 'valid' | 'already_used' | 'invalid' | 'wrong_event' | 'not_approved' | 'unauthorized' | 'error';

interface ScanResult {
  ticket?: any;
  message: string;
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
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [allEvents, setAllEvents] = useState<any[]>([]);

  useEffect(() => {
    api.get('/events?limit=50').then((res) => {
      if (res.data.success) {
        setAllEvents(res.data.data || []);
      }
    }).catch(() => {});
  }, []);

  const lastScanned = useRef<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (readerRef.current) {
      try {
        (readerRef.current as any).reset?.();
      } catch {}
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const validateQrCode = useCallback(async (code: string) => {
    if (isProcessing || lastScanned.current === code) return;
    lastScanned.current = code;
    setIsProcessing(true);

    try {
      const res = await api.post(`/events/${eventId}/ticketing/scan`, { qrPayload: code });
      if (res.data.success) {
        setScanState('valid');
        setResult({ ticket: res.data.data, message: res.data.message });
      } else {
        throw new Error(res.data.error || 'Invalid ticket code');
      }
    } catch (err: any) {
      const status = err.response?.status;
      const errCode = err.response?.data?.error;
      const errMsg = err.response?.data?.message || err.message || 'Ticket validation failed';
      const errTicket = err.response?.data?.data?.ticket;

      if (errCode === 'ALREADY_SCANNED') {
        setScanState('already_used');
      } else if (errCode === 'WRONG_EVENT') {
        setScanState('wrong_event');
      } else if (errCode === 'NOT_APPROVED') {
        setScanState('not_approved');
      } else if (status === 403 || status === 401) {
        setScanState('unauthorized');
      } else {
        setScanState('invalid');
      }
      setResult({ message: errMsg, error: errCode, ticket: errTicket });
    } finally {
      setIsProcessing(false);
    }
  }, [eventId, isProcessing]);

  const startCamera = useCallback(async (overrideDeviceId?: string) => {
    stopCamera();
    setCameraError(null);
    setScanState('scanning');
    setResult(null);
    lastScanned.current = null;

    try {
      // Check for getUserMedia support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or environment (requires HTTPS).');
      }

      // Enumerate available video inputs
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);

      let stream: MediaStream;
      const targetDeviceId = overrideDeviceId || selectedDeviceId;

      if (targetDeviceId) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: targetDeviceId } },
        });
      } else {
        // Prefer rear environment camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
          });
        } catch {
          // Fallback to any video device
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }

      activeStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Initialize ZXing QR Reader
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      reader.decodeFromStream(stream, videoRef.current!, (res, error) => {
        if (res) {
          validateQrCode(res.getText());
        }
        if (error && error.name !== 'NotFoundException') {
          console.warn('Scan error:', error);
        }
      });
    } catch (err: any) {
      console.error('Camera init error:', err);
      let msg = err.message || 'Could not activate camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found on this device.';
      }
      setCameraError(msg);
      setScanState('idle');
    }
  }, [selectedDeviceId, stopCamera, validateQrCode]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  const switchCamera = () => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    setSelectedDeviceId(nextDevice.deviceId);
    startCamera(nextDevice.deviceId);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    validateQrCode(manualCode.trim());
    setManualCode('');
  };

  const handleReset = () => {
    if (cooldownRef.current) clearTimeout(cooldownRef.current);
    lastScanned.current = null;
    setScanState('scanning');
    setResult(null);
  };

  const bgColor =
    scanState === 'valid' ? 'bg-green-950' :
    scanState === 'already_used' ? 'bg-yellow-950' :
    scanState === 'wrong_event' ? 'bg-orange-950' :
    scanState === 'not_approved' ? 'bg-purple-950' :
    scanState === 'unauthorized' ? 'bg-gray-900' :
    scanState === 'invalid' ? 'bg-red-950' : 'bg-black';
  const borderColor =
    scanState === 'valid' ? 'border-green/30' :
    scanState === 'already_used' ? 'border-yellow-400/30' :
    scanState === 'wrong_event' ? 'border-orange-400/30' :
    scanState === 'not_approved' ? 'border-purple-400/30' :
    scanState === 'unauthorized' ? 'border-gray-500/30' :
    scanState === 'invalid' ? 'border-red-500/30' : 'border-dark-gray';

  return (
    <div className={`min-h-screen ${bgColor} flex flex-col transition-colors duration-300 select-none overscroll-none`}>
      {/* App Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 border-b border-white/10 bg-black/90 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { stopCamera(); navigate(-1); }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <p className="text-[10px] text-gold uppercase font-bold tracking-widest">PRO+ LIVE SCANNER</p>
            {allEvents.length > 1 ? (
              <select
                value={eventId}
                onChange={(e) => navigate(`/dashboard/events/${e.target.value}/scan`, { replace: true })}
                className="bg-black/80 border border-gold/40 text-gold text-xs font-bold rounded-lg px-2 py-1 mt-0.5 max-w-[170px] truncate"
              >
                {allEvents.map((evt) => (
                  <option key={evt.id} value={evt.id} className="bg-black text-white">
                    {evt.title}
                  </option>
                ))}
              </select>
            ) : (
              <h1 className="text-white font-bold text-base leading-tight">Live Door Scanner</h1>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {devices.length > 1 && (
            <button
              onClick={switchCamera}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Switch Camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className={`p-2 rounded-full transition-colors ${showManualInput ? 'bg-gold text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title="Manual Code Entry"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Manual Input Bar Toggle */}
      <AnimatePresence>
        {showManualInput && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleManualSubmit}
            className="bg-black-surface border-b border-gold/30 p-3 px-4 flex gap-2 z-20"
          >
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter 12-digit ticket code or QR payload..."
              className="flex-1 bg-black border border-dark-gray rounded-xl px-3 py-2 text-xs text-white placeholder:text-text-muted focus:border-gold outline-none"
            />
            <button
              type="submit"
              disabled={!manualCode.trim() || isProcessing}
              className="px-4 py-2 bg-gold-gradient text-black font-semibold text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> Verify
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {scanState === 'scanning' && !cameraError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="absolute inset-0 bg-black/50"
              style={{ mask: 'radial-gradient(ellipse 230px 230px at center, transparent 0, black 100%)' }}
            />
            <div className="relative w-60 h-60">
              <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-gold rounded-tl-xl" />
              <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-gold rounded-tr-xl" />
              <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-gold rounded-bl-xl" />
              <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-gold rounded-br-xl" />
              <motion.div
                className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent shadow-[0_0_12px_rgba(244, 224, 89,0.9)]"
                animate={{ top: ['12px', '228px', '12px'] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
              />
            </div>
            <p className="absolute bottom-[24%] text-white/80 text-xs font-medium tracking-wide bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">
              Align Ticket QR code inside frame
            </p>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20">
            <Loader2 className="w-12 h-12 text-gold animate-spin mb-3" />
            <p className="text-white text-sm font-semibold">Verifying Ticket Signature...</p>
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/95 px-8 text-center z-20">
            <div className="w-16 h-16 rounded-full bg-red/10 border border-red/30 flex items-center justify-center text-red">
              <Camera className="w-8 h-8" />
            </div>
            <p className="text-white font-semibold text-sm max-w-sm">{cameraError}</p>
            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <button
                onClick={() => startCamera()}
                className="w-full py-3 bg-gold-gradient text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Restart Camera
              </button>
              <button
                onClick={() => setShowManualInput(true)}
                className="w-full py-2.5 bg-white/10 text-white rounded-xl font-medium text-xs flex items-center justify-center gap-2"
              >
                <Keyboard className="w-4 h-4 text-gold" /> Enter Code Manually
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Result Panel */}
      <AnimatePresence>
        {(scanState === 'valid' || scanState === 'already_used' || scanState === 'invalid' || scanState === 'wrong_event' || scanState === 'not_approved' || scanState === 'unauthorized') && result && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className={`fixed bottom-0 left-0 right-0 rounded-t-3xl p-6 pb-safe shadow-2xl border-t ${borderColor} ${bgColor} z-40`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                scanState === 'valid' ? 'bg-green/20' :
                scanState === 'already_used' ? 'bg-yellow-400/20' :
                scanState === 'wrong_event' ? 'bg-orange-400/20' :
                scanState === 'not_approved' ? 'bg-purple-400/20' :
                scanState === 'unauthorized' ? 'bg-gray-500/20' :
                'bg-red-500/20'
              }`}>
                {scanState === 'valid' ? <CheckCircle2 className="w-8 h-8 text-green" /> :
                 scanState === 'already_used' ? <AlertCircle className="w-8 h-8 text-yellow-400" /> :
                 scanState === 'wrong_event' ? <MapPin className="w-8 h-8 text-orange-400" /> :
                 scanState === 'not_approved' ? <Clock className="w-8 h-8 text-purple-400" /> :
                 scanState === 'unauthorized' ? <User className="w-8 h-8 text-gray-400" /> :
                 <XCircle className="w-8 h-8 text-red-400" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`font-bold text-lg ${
                  scanState === 'valid' ? 'text-green' :
                  scanState === 'already_used' ? 'text-yellow-400' :
                  scanState === 'wrong_event' ? 'text-orange-300' :
                  scanState === 'not_approved' ? 'text-purple-300' :
                  scanState === 'unauthorized' ? 'text-gray-300' :
                  'text-red-300'
                }`}>
                  {scanState === 'valid' ? '✅ Checked In' :
                   scanState === 'already_used' ? '⚠️ Ticket Already Used' :
                   scanState === 'wrong_event' ? '❌ Wrong Event' :
                   scanState === 'not_approved' ? '⏳ Ticket Not Active' :
                   scanState === 'unauthorized' ? '🔒 Scanner Not Authorized' :
                   '❌ Invalid Ticket'}
                </p>
                <p className="text-white/80 text-xs mt-1 leading-relaxed">{result.message}</p>

                {result.ticket && (
                  <div className="mt-4 space-y-2 bg-black/40 border border-white/10 rounded-xl p-3 text-xs">
                    <div className="flex items-center gap-2 text-white"><User className="w-4 h-4 text-gold shrink-0" /> <span className="font-semibold">{result.ticket.buyerName || result.ticket.user?.name || 'Guest'}</span></div>
                    <div className="flex items-center gap-2 text-white/80"><Ticket className="w-4 h-4 text-gold shrink-0" /> {result.ticket.ticketType?.name || 'General Admission'} · <span className="font-mono text-gold">{result.ticket.ticketNumber || result.ticket.id}</span></div>
                    <div className="flex items-center gap-2 text-white/60"><Clock className="w-4 h-4 text-gold shrink-0" /> Purchased {formatDateTime(result.ticket.createdAt || Date.now())}</div>
                    {result.ticket.scannedAt && <div className="flex items-center gap-2 text-white/60"><MapPin className="w-4 h-4 text-gold shrink-0" /> Scanned {formatDateTime(result.ticket.scannedAt)}</div>}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-sm transition-all active:scale-98"
              >
                Scan Next Ticket
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}