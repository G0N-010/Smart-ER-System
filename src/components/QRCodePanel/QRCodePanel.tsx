// QRCodePanel — Displays a scannable QR code for patient self-registration
// Uses Supabase Realtime for cross-device live updates
import { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { PatientRequest } from '../../simulation/types';
import { supabase, rowToPatientRequest } from '../../lib/supabase';
import type { PatientRequestRow } from '../../lib/supabase';
import { QrCode, RefreshCw, Trash2, Clock, AlertCircle, CheckCircle2, Eye, Cloud, CloudOff } from 'lucide-react';

interface QRCodePanelProps {
  className?: string;
}

export default function QRCodePanel({ className = '' }: QRCodePanelProps) {
  const [requests, setRequests] = useState<PatientRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PatientRequest | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Check if we are on localhost
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  // Generate the QR code URL — points to the same app with ?intake=true
  const qrUrl = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    return `${base}?intake=true`;
  }, []);

  // Fetch initial requests from Supabase + subscribe to realtime updates
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('patient_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped = (data as PatientRequestRow[]).map(rowToPatientRequest);
        setRequests(mapped);
        setIsOnline(true);
      } catch (err) {
        console.error('Supabase fetch error, falling back to localStorage:', err);
        setIsOnline(false);
        // Fallback to localStorage
        const stored = JSON.parse(localStorage.getItem('smarter-patient-requests') || '[]') as PatientRequest[];
        setRequests(stored);
      }
    };

    fetchRequests();

    // Subscribe to realtime changes
    channel = supabase
      .channel('patient_requests_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patient_requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newReq = rowToPatientRequest(payload.new as PatientRequestRow);
            setRequests(prev => [newReq, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = rowToPatientRequest(payload.new as PatientRequestRow);
            setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as Record<string, unknown>).id;
            setRequests(prev => prev.filter(r => r.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Fallback: poll localStorage when offline
  useEffect(() => {
    if (isOnline) return;
    const loadRequests = () => {
      const stored = JSON.parse(localStorage.getItem('smarter-patient-requests') || '[]') as PatientRequest[];
      setRequests(stored);
    };
    const interval = setInterval(loadRequests, 2000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const clearRequests = async () => {
    if (isOnline) {
      try {
        await supabase.from('patient_requests').delete().neq('id', '');
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
    localStorage.removeItem('smarter-patient-requests');
    setRequests([]);
    setSelectedRequest(null);
  };

  const updateRequestStatus = async (id: string, status: PatientRequest['status']) => {
    if (isOnline) {
      try {
        const { error } = await supabase
          .from('patient_requests')
          .update({ status })
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Status update error:', err);
      }
    } else {
      // Fallback localStorage update
      const updated = requests.map(r => r.id === id ? { ...r, status } : r);
      localStorage.setItem('smarter-patient-requests', JSON.stringify(updated));
      setRequests(updated);
    }
    if (selectedRequest?.id === id) {
      setSelectedRequest({ ...selectedRequest, status });
    }
  };

  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  const statusColors = {
    Pending: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    Reviewed: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    Admitted: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  };

  const urgencyIcons = {
    Emergency: '🚨',
    Urgent: '⚡',
    Standard: '🟢',
  };

  return (
    <div className={`glass-card p-4 animate-fade-in-up ${className}`} style={{ animationDelay: '0.7s' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Patient Check-In</h3>
          {pendingCount > 0 && (
            <span className="relative flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex items-center justify-center rounded-full h-5 w-5 bg-red-500 text-[10px] text-white font-bold">
                {pendingCount}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Online/Offline indicator */}
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] ${
            isOnline
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {isOnline ? <Cloud className="w-2.5 h-2.5" /> : <CloudOff className="w-2.5 h-2.5" />}
            {isOnline ? 'Live' : 'Local'}
          </div>
          {requests.length > 0 && (
            <>
              <button
                onClick={() => setShowRequests(!showRequests)}
                className="text-[10px] px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700/30 text-slate-400 hover:text-white transition-colors"
              >
                {showRequests ? 'Hide' : 'View'} ({requests.length})
              </button>
              <button
                onClick={clearRequests}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-800/50 border border-slate-700/30 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-all"
                title="Clear all requests"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {isLocalhost && (
        <div className="mb-4 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 text-amber-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] leading-tight">
            You are viewing this on <strong>localhost</strong>. The QR code encodes "localhost", which won't work on your phone. <br/>
            Open this dashboard using your computer's network IP (e.g. <span className="font-mono text-white opacity-80">192.168.x.x:5174</span>) instead.
          </p>
        </div>
      )}

      {/* QR Code + Instructions */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* QR Code */}
        <div className="bg-white rounded-xl p-3 shadow-lg shadow-emerald-500/10">
          <QRCodeSVG
            value={qrUrl}
            size={140}
            bgColor="#ffffff"
            fgColor="#0a0f1e"
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Instructions */}
        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs text-slate-300 mb-2 font-medium">
            Scan to self-register
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-[9px] font-bold flex-shrink-0">1</span>
              Patient scans QR with phone camera
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-[9px] font-bold flex-shrink-0">2</span>
              Fills in symptoms & medical history
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-[9px] font-bold flex-shrink-0">3</span>
              Request appears here instantly via cloud
            </div>
          </div>
          <p className="text-[9px] text-slate-600 mt-2 break-all">
            {qrUrl}
          </p>
        </div>
      </div>

      {/* Patient Requests List */}
      {showRequests && requests.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700/30 space-y-2 max-h-[300px] overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            {isOnline ? (
              <>
                <Cloud className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400">Realtime — updates instantly via Supabase</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" style={{ animationDuration: '3s' }} />
                <span className="text-[10px] text-slate-500">Local mode — auto-refreshes every 2s</span>
              </>
            )}
          </div>

          {requests.map(req => (
            <div
              key={req.id}
              className={`p-3 rounded-xl bg-slate-800/40 border border-slate-700/30 hover:border-slate-600 transition-all cursor-pointer ${
                selectedRequest?.id === req.id ? 'ring-1 ring-emerald-500/40' : ''
              }`}
              onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">{urgencyIcons[req.urgencyLevel]}</span>
                  <div>
                    <div className="text-xs font-medium text-white">{req.name}</div>
                    <div className="text-[10px] text-slate-500">
                      Age {req.age} • Pain {req.painLevel}/10 • {new Date(req.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[req.status]}`}>
                    {req.status}
                  </span>
                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                </div>
              </div>

              {/* Expanded details */}
              {selectedRequest?.id === req.id && (
                <div className="mt-3 pt-3 border-t border-slate-700/20 space-y-2 animate-fade-in">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-slate-500 block">Symptoms</span>
                      <span className="text-slate-300">{req.symptoms}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Gender</span>
                      <span className="text-slate-300">{req.gender}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Phone</span>
                      <span className="text-slate-300">{req.phone || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Allergies</span>
                      <span className="text-slate-300">{req.allergies || 'None'}</span>
                    </div>
                    {req.existingConditions && (
                      <div className="col-span-2">
                        <span className="text-slate-500 block">Existing Conditions</span>
                        <span className="text-slate-300">{req.existingConditions}</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    {req.status === 'Pending' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateRequestStatus(req.id, 'Reviewed'); }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-medium hover:bg-blue-500/20 transition-all"
                      >
                        <Clock className="w-3 h-3" /> Mark Reviewed
                      </button>
                    )}
                    {(req.status === 'Pending' || req.status === 'Reviewed') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateRequestStatus(req.id, 'Admitted'); }}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium hover:bg-emerald-500/20 transition-all"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Admit
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {showRequests && requests.length === 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700/30 text-center py-4">
          <AlertCircle className="w-5 h-5 text-slate-600 mx-auto mb-2" />
          <p className="text-[10px] text-slate-500">No patient requests yet</p>
          <p className="text-[9px] text-slate-600">Scan the QR code to submit a test request</p>
        </div>
      )}
    </div>
  );
}
