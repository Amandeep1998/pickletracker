import React, { useState, useEffect } from 'react';
import { getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp } from '../services/api';

export default function WhatsAppConnect() {
  const [status, setStatus] = useState('loading'); // 'loading' | 'disabled' | 'connected' | 'disconnected'
  const [phone, setPhone] = useState('');
  const [linkedPhone, setLinkedPhone] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false); // show confirmation popup

  useEffect(() => {
    getWhatsAppStatus()
      .then((res) => {
        if (!res.data.enabled) {
          setStatus('disabled');
        } else if (res.data.connected) {
          setLinkedPhone(res.data.phone);
          setStatus('connected');
        } else {
          setStatus('disconnected');
        }
      })
      .catch(() => setStatus('disabled'));
  }, []);

  const handleConnectClick = () => {
    setError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setConfirming(true);
  };

  const handleConfirm = async () => {
    setConfirming(false);
    setSaving(true);
    const digits = phone.replace(/\D/g, '');
    try {
      await connectWhatsApp(digits);
      setLinkedPhone(`91${digits}`);
      setStatus('connected');
      setPhone('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not connect. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    try {
      await disconnectWhatsApp();
      setLinkedPhone(null);
      setStatus('disconnected');
    } catch {
      setError('Could not disconnect. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const formatDisplay = (waId) => {
    if (!waId) return '';
    const num = waId.startsWith('91') ? waId.slice(2) : waId;
    return `+91 ${num.slice(0, 5)} ${num.slice(5)}`;
  };

  if (status === 'loading' || status === 'disabled') return null;

  const digits = phone.replace(/\D/g, '');

  return (
    <>
    {/* Confirmation popup */}
    {confirming && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center shrink-0">
              <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Confirm your number</p>
              <p className="text-xs text-gray-400">Is this your WhatsApp number?</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-center">
            <p className="text-xl font-bold text-gray-800 tracking-wide">
              +91 {digits.slice(0, 5)} {digits.slice(5)}
            </p>
          </div>

          <p className="text-xs text-gray-500 text-center mb-5">
            You will receive a WhatsApp message from PickleTracker on this number.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 border border-gray-200 text-gray-600 font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Edit Number
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
            >
              Yes, Connect
            </button>
          </div>
        </div>
      </div>
    )}

    <div className={`rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
      status === 'connected'
        ? 'bg-[#f0fdf4] border-[#25D366]/30'
        : 'bg-white border-gray-200'
    }`}>

      {/* Icon + label */}
      <div className="flex items-center gap-2.5 min-w-0">
        <WhatsAppIcon className={`w-5 h-5 shrink-0 ${status === 'connected' ? 'text-[#25D366]' : 'text-gray-400'}`} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-700 leading-tight">
            {status === 'connected' ? 'WhatsApp Connected' : 'Connect WhatsApp'}
          </p>
          <p className="text-xs text-gray-400 leading-tight mt-0.5">
            {status === 'connected'
              ? formatDisplay(linkedPhone)
              : 'Manage tournaments directly from WhatsApp'}
          </p>
        </div>
      </div>

      {/* Action area */}
      <div className="sm:ml-auto flex flex-col gap-1.5">
        {status === 'disconnected' && (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-44">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 select-none">+91</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                  placeholder="98765 43210"
                  maxLength={10}
                  className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-[#25D366]"
                />
              </div>
              <button
                onClick={handleConnectClick}
                disabled={saving || !phone.trim()}
                className="bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-50 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                {saving ? 'Connecting…' : 'Connect'}
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </>
        )}

        {status === 'connected' && (
          <div className="flex items-center gap-3 sm:flex-col sm:items-end gap-y-1.5">
            {import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER && (
              <a
                href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER}?text=Hi`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
                Open WhatsApp
              </a>
            )}
            <button
              onClick={handleDisconnect}
              disabled={saving}
              className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

function WhatsAppIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
