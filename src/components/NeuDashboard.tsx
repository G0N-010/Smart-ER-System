// NeuDashboard — Neumorphic dashboard with real-time patient notifications,
// manual patient entry for nurses/doctors, and full navigation
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Heart, LayoutDashboard, Activity, Users, Settings, Search,
  Bell, Sun, Moon, Zap, Cpu, HardDrive, Wifi, Play,
  TrendingUp, TrendingDown, Server, QrCode, LogOut,
  Stethoscope, ShieldCheck, Timer, Plus, X, Clock,
  AlertCircle, UserPlus, CheckCircle2, Eye, Trash2, Cloud, CloudOff
} from 'lucide-react';
import ConfigPanel from './ConfigPanel/ConfigPanel';
import Dashboard from './Dashboard/Dashboard';
import QRCodePanel from './QRCodePanel/QRCodePanel';
import type { HospitalConfig, SimulationResult, PatientRequest, Patient, MedicalCondition } from '../simulation/types';
import { supabase, rowToPatientRequest } from '../lib/supabase';
import { CONDITION_WEIGHTS, getAgeWeight } from '../constants/medicalData';
import { calculateSeverityScore, assignTriageLevel } from '../simulation/severityEngine';
import { optimizeResources } from '../simulation/optimizer';
import { calculateHourlyStats } from '../simulation/monteCarlo';
import type { PatientRequestRow } from '../lib/supabase';

interface NeuDashboardProps {
  user: { name: string; role: string; avatar: string } | null;
  onLogout: () => void;
  config: HospitalConfig;
  result: SimulationResult | null;
  isRunning: boolean;
  progress: number;
  updateConfig: (updates: Partial<HospitalConfig>) => void;
  runSimulation: () => void;
}

// ── Notification toast type ──
interface Toast {
  id: string;
  message: string;
  type: 'patient' | 'success' | 'warning';
  timestamp: number;
}

// ── Count-up hook ──
function useNeuCountUp(target: number, duration = 1800, decimals = 0) {
  const [value, setValue] = useState(0);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const current = eased * target;
            setValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.round(current));
            if (progress < 1) requestAnimationFrame(animate);
            else setDone(true);
          };
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, decimals]);

  return { value, done, ref };
}

// ── Map symptoms to medical conditions ──
function mapSymptomsToCondition(symptoms: string, urgency: string): MedicalCondition {
  const s = symptoms.toLowerCase();
  if (s.includes('cardiac') || s.includes('heart attack')) return 'Cardiac Arrest';
  if (s.includes('respiratory') || s.includes('breathing') || s.includes('breath')) return 'Respiratory Failure';
  if (s.includes('stroke') || s.includes('numbness') || s.includes('slurring')) return 'Stroke';
  if (s.includes('trauma') || s.includes('accident') || s.includes('bleed')) return 'Severe Trauma';
  if (s.includes('chest pain') || s.includes('chest')) return 'Chest Pain';
  if (s.includes('fracture') || s.includes('broken') || s.includes('bone')) return 'Fracture';
  if (s.includes('fever') || s.includes('temperature') || s.includes('flu')) return 'Fever';
  if (urgency === 'Emergency') return 'Chest Pain';
  if (urgency === 'Urgent') return 'Fracture';
  return 'Minor Laceration';
}

// ── Convert live patients to simulation Patients ──
function convertLivePatientsToSimulation(livePatients: PatientRequest[]): { patients: Patient[]; surgeHours: number[] } {
  const patients: Patient[] = livePatients.map((p, idx) => {
    const condition = mapSymptomsToCondition(p.symptoms, p.urgencyLevel);
    const ageWeight = getAgeWeight(p.age);
    const conditionWeight = CONDITION_WEIGHTS[condition];
    const randomRisk = p.painLevel / 10;
    const severityScore = calculateSeverityScore(ageWeight, conditionWeight, randomRisk);
    const triageLevel = assignTriageLevel(severityScore);
    const arrivalTime = idx * 8; // spread arrivals across time

    return {
      id: `LV-${String(idx + 1).padStart(4, '0')}`,
      arrivalTime,
      age: p.age,
      condition,
      severityScore,
      triageLevel,
      waitTime: 0,
      resourceAssigned: null,
      isUnmet: false,
      ageWeight,
      conditionWeight,
      randomRisk,
      explanation: `Live patient: ${p.name} — ${condition} (${p.urgencyLevel}), Pain ${p.painLevel}/10, Score: ${severityScore} → ${triageLevel}`,
    };
  });
  return { patients, surgeHours: [] };
}

// ── Terminal lines ──
const TERMINAL_LINES = [
  { text: '$ smarter --status', type: 'cmd' as const },
  { text: '→ System: Online', type: 'ok' as const },
  { text: '→ Supabase: Connected (ws://realtime)', type: 'ok' as const },
  { text: '→ Simulation Engine: Ready', type: 'ok' as const },
  { text: '→ Patient Queue: Monitoring...', type: 'warn' as const },
];

export default function NeuDashboard({
  user, onLogout, config, result, isRunning, progress, updateConfig, runSimulation
}: NeuDashboardProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeNav, setActiveNav] = useState('dashboard');
  const [liveSimResult, setLiveSimResult] = useState<SimulationResult | null>(null);
  const [isLiveSimRunning, setIsLiveSimRunning] = useState(false);

  // ── Patient data from Supabase ──
  const [patients, setPatients] = useState<PatientRequest[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<PatientRequest | null>(null);

  // ── Notification toasts ──
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifHistory, setNotifHistory] = useState<Toast[]>([]);

  // ── Manual Add Patient form ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '', age: '', gender: 'Male' as PatientRequest['gender'],
    phone: '', symptoms: '', painLevel: 5,
    allergies: '', existingConditions: '',
    urgencyLevel: 'Standard' as PatientRequest['urgencyLevel'],
    doctorNotes: '',
  });
  const [addFormSubmitting, setAddFormSubmitting] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light');
  }, []);

  // ── Add a toast notification ──
  const addToast = useCallback((message: string, type: Toast['type'] = 'patient') => {
    const toast: Toast = { id: crypto.randomUUID(), message, type, timestamp: Date.now() };
    setToasts(prev => [toast, ...prev].slice(0, 5));
    setNotifHistory(prev => [toast, ...prev].slice(0, 50));
    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, 6000);
  }, []);

  // ── Fetch patients from Supabase + realtime subscription ──
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchPatients = async () => {
      try {
        const { data, error } = await supabase
          .from('patient_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setPatients((data as PatientRequestRow[]).map(rowToPatientRequest));
        setIsOnline(true);
      } catch {
        setIsOnline(false);
        setPatients(JSON.parse(localStorage.getItem('smarter-patient-requests') || '[]'));
      }
    };

    fetchPatients();

    channel = supabase
      .channel('dashboard_patient_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patient_requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newP = rowToPatientRequest(payload.new as PatientRequestRow);
            setPatients(prev => [newP, ...prev]);
            // 🔔 Show notification toast
            addToast(`New patient: ${newP.name} (${newP.urgencyLevel}) — Pain ${newP.painLevel}/10`);
          } else if (payload.eventType === 'UPDATE') {
            const updated = rowToPatientRequest(payload.new as PatientRequestRow);
            setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as Record<string, string>).id;
            setPatients(prev => prev.filter(p => p.id !== oldId));
          }
        }
      )
      .subscribe();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, [addToast]);

  // ── Update patient status ──
  const updateStatus = async (id: string, status: PatientRequest['status']) => {
    try {
      await supabase.from('patient_requests').update({ status }).eq('id', id);
      addToast(`Patient status updated to ${status}`, 'success');
    } catch {
      // fallback
    }
    setPatients(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    if (selectedPatient?.id === id) setSelectedPatient({ ...selectedPatient, status });
  };

  // ── Delete patient ──
  const deletePatient = async (id: string) => {
    try {
      await supabase.from('patient_requests').delete().eq('id', id);
    } catch { /* fallback */ }
    setPatients(prev => prev.filter(p => p.id !== id));
    if (selectedPatient?.id === id) setSelectedPatient(null);
  };

  // ── Clear all patients ──
  const clearAll = async () => {
    try {
      await supabase.from('patient_requests').delete().neq('id', '');
    } catch { /* fallback */ }
    localStorage.removeItem('smarter-patient-requests');
    setPatients([]);
    setSelectedPatient(null);
    addToast('All patient records cleared', 'warning');
  };

  // ── Submit manual patient entry ──
  const handleAddPatient = async () => {
    if (!addForm.name || !addForm.age || !addForm.symptoms) return;
    setAddFormSubmitting(true);
    try {
      const { error } = await supabase.from('patient_requests').insert({
        id: crypto.randomUUID(),
        name: addForm.name,
        age: parseInt(addForm.age),
        gender: addForm.gender,
        phone: addForm.phone || '',
        symptoms: `${addForm.symptoms}${addForm.doctorNotes ? `\n[Staff Notes: ${addForm.doctorNotes}]` : ''}`,
        pain_level: addForm.painLevel,
        allergies: addForm.allergies || '',
        existing_conditions: addForm.existingConditions || '',
        urgency_level: addForm.urgencyLevel,
        status: 'Pending',
      });
      if (error) throw error;
      addToast(`Patient ${addForm.name} added by ${user?.name || 'Staff'}`, 'success');
      setAddForm({
        name: '', age: '', gender: 'Male', phone: '', symptoms: '',
        painLevel: 5, allergies: '', existingConditions: '',
        urgencyLevel: 'Standard', doctorNotes: '',
      });
      setShowAddForm(false);
    } catch (err) {
      console.error('Add patient error:', err);
      addToast('Failed to add patient — check connection', 'warning');
    }
    setAddFormSubmitting(false);
  };

  // ── Stats from simulation ──
  // Use liveSimResult if available, otherwise standard result
  const activeResult = liveSimResult || result;
  const totalPatients = activeResult?.patients?.length || 0;
  const critPct = activeResult ? Math.round((activeResult.patients.filter(p => p.triageLevel === 'P1').length / totalPatients) * 100) || 0 : 0;
  const avgWait = activeResult ? parseFloat((activeResult.patients.reduce((s, p) => s + p.waitTime, 0) / totalPatients).toFixed(1)) || 0 : 0;
  const exhaustionEvents = activeResult?.summary?.resourceExhaustionEvents || 0;

  const { value: stat1Value, done: stat1Done, ref: stat1Ref } = useNeuCountUp(totalPatients, 1800);
  const { value: stat2Value, done: stat2Done, ref: stat2Ref } = useNeuCountUp(critPct, 1800);
  const { value: stat3Value, done: stat3Done, ref: stat3Ref } = useNeuCountUp(avgWait, 1800, 1);
  const { value: stat4Value, done: stat4Done, ref: stat4Ref } = useNeuCountUp(exhaustionEvents, 1800);

  const doctorUtil = activeResult ? Math.min(100, Math.round((totalPatients / (config.doctors * 8)) * 100)) : 42;
  const icuUtil = activeResult ? Math.min(100, Math.round((activeResult.patients.filter(p => p.triageLevel === 'P1').length / config.icuBeds) * 100)) : 67;
  const ventUtil = activeResult ? Math.min(100, Math.round((activeResult.patients.filter(p => p.condition === 'Respiratory Failure').length / config.ventilators) * 100)) : 31;
  const netLoad = activeResult ? Math.min(100, Math.round(totalPatients / ((config.doctors + config.icuBeds + config.ventilators) * 2) * 100)) : 85;

  const pendingCount = patients.filter(p => p.status === 'Pending').length;

  const urgencyColors: Record<string, string> = {
    Emergency: '#ef4444', Urgent: '#f59e0b', Standard: '#22c55e',
  };
  const statusColors: Record<string, string> = {
    Pending: '#f59e0b', Reviewed: '#6366f1', Admitted: '#22c55e',
  };

  return (
    <div className="nm-dashboard">
      {/* ═══ NOTIFICATION TOASTS ═══ */}
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 10000,
        display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380,
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              background: toast.type === 'patient' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : toast.type === 'success' ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: '#fff', padding: '14px 18px', borderRadius: 14,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'flex-start', gap: 10,
              animation: 'toastSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              fontFamily: "'Satoshi', 'Plus Jakarta Sans', sans-serif",
            }}
          >
            {toast.type === 'patient' ? <UserPlus className="w-5 h-5 flex-shrink-0" style={{ marginTop: 1 }} />
              : toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ marginTop: 1 }} />
              : <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ marginTop: 1 }} />}
            <div style={{ flex: 1 }}>
              <div>{toast.message}</div>
              <div style={{ fontSize: 10, opacity: 0.8, marginTop: 3 }}>
                {new Date(toast.timestamp).toLocaleTimeString()}
              </div>
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.7 }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* ═══ ADD PATIENT MODAL ═══ */}
      {showAddForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9000,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'toastSlideIn 0.3s ease',
        }} onClick={() => setShowAddForm(false)}>
          <div
            style={{
              background: 'var(--nm-bg)', borderRadius: 20, padding: 28, width: '90%', maxWidth: 520,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              maxHeight: '80vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'linear-gradient(135deg, var(--nm-accent-indigo), var(--nm-accent-emerald))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <UserPlus className="w-5 h-5" style={{ color: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--nm-text)', fontFamily: "'General Sans', sans-serif" }}>
                    Add Patient
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--nm-text-muted)' }}>Nurse / Doctor Manual Entry</div>
                </div>
              </div>
              <button onClick={() => setShowAddForm(false)} style={{
                background: 'var(--nm-highlight)', border: 'none', borderRadius: 10,
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--nm-text-muted)',
                boxShadow: 'var(--nm-shadow-convex)',
              }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Name */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--nm-text-muted)', marginBottom: 4, display: 'block' }}>Patient Name *</label>
                <input
                  value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none',
                    background: 'var(--nm-bg)', boxShadow: 'var(--nm-shadow-concave)',
                    color: 'var(--nm-text)', fontSize: 13, outline: 'none',
                    fontFamily: "'Satoshi', sans-serif",
                  }}
                />
              </div>

              {/* Age */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--nm-text-muted)', marginBottom: 4, display: 'block' }}>Age *</label>
                <input
                  type="number" value={addForm.age} onChange={e => setAddForm(f => ({ ...f, age: e.target.value }))}
                  placeholder="Age" min="1" max="120"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none',
                    background: 'var(--nm-bg)', boxShadow: 'var(--nm-shadow-concave)',
                    color: 'var(--nm-text)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>

              {/* Gender */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--nm-text-muted)', marginBottom: 4, display: 'block' }}>Gender</label>
                <select
                  value={addForm.gender} onChange={e => setAddForm(f => ({ ...f, gender: e.target.value as PatientRequest['gender'] }))}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none',
                    background: 'var(--nm-bg)', boxShadow: 'var(--nm-shadow-concave)',
                    color: 'var(--nm-text)', fontSize: 13, outline: 'none',
                  }}
                >
                  <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
                </select>
              </div>

              {/* Phone */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--nm-text-muted)', marginBottom: 4, display: 'block' }}>Phone</label>
                <input
                  value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone number"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none',
                    background: 'var(--nm-bg)', boxShadow: 'var(--nm-shadow-concave)',
                    color: 'var(--nm-text)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>

              {/* Urgency */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--nm-text-muted)', marginBottom: 4, display: 'block' }}>Urgency Level</label>
                <select
                  value={addForm.urgencyLevel} onChange={e => setAddForm(f => ({ ...f, urgencyLevel: e.target.value as PatientRequest['urgencyLevel'] }))}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none',
                    background: 'var(--nm-bg)', boxShadow: 'var(--nm-shadow-concave)',
                    color: 'var(--nm-text)', fontSize: 13, outline: 'none',
                  }}
                >
                  <option>Standard</option><option>Urgent</option><option>Emergency</option>
                </select>
              </div>

              {/* Pain Level */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--nm-text-muted)', marginBottom: 4, display: 'block' }}>
                  Pain Level: {addForm.painLevel}/10
                </label>
                <input
                  type="range" min="1" max="10" value={addForm.painLevel}
                  onChange={e => setAddForm(f => ({ ...f, painLevel: parseInt(e.target.value) }))}
                  style={{ width: '100%', accentColor: 'var(--nm-accent-indigo)' }}
                />
              </div>

              {/* Symptoms */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--nm-text-muted)', marginBottom: 4, display: 'block' }}>Symptoms *</label>
                <textarea
                  value={addForm.symptoms} onChange={e => setAddForm(f => ({ ...f, symptoms: e.target.value }))}
                  placeholder="Describe symptoms..."
                  rows={2}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none',
                    background: 'var(--nm-bg)', boxShadow: 'var(--nm-shadow-concave)',
                    color: 'var(--nm-text)', fontSize: 13, outline: 'none', resize: 'vertical',
                    fontFamily: "'Satoshi', sans-serif",
                  }}
                />
              </div>

              {/* Allergies */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--nm-text-muted)', marginBottom: 4, display: 'block' }}>Allergies</label>
                <input
                  value={addForm.allergies} onChange={e => setAddForm(f => ({ ...f, allergies: e.target.value }))}
                  placeholder="Any allergies"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none',
                    background: 'var(--nm-bg)', boxShadow: 'var(--nm-shadow-concave)',
                    color: 'var(--nm-text)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>

              {/* Existing Conditions */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--nm-text-muted)', marginBottom: 4, display: 'block' }}>Pre-existing Cond.</label>
                <input
                  value={addForm.existingConditions} onChange={e => setAddForm(f => ({ ...f, existingConditions: e.target.value }))}
                  placeholder="e.g. Diabetes, Asthma"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12, border: 'none',
                    background: 'var(--nm-bg)', boxShadow: 'var(--nm-shadow-concave)',
                    color: 'var(--nm-text)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>

              {/* Doctor/Nurse Notes */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--nm-accent-indigo)', marginBottom: 4, display: 'block' }}>
                  📋 Staff Notes (visible only to staff)
                </label>
                <textarea
                  value={addForm.doctorNotes} onChange={e => setAddForm(f => ({ ...f, doctorNotes: e.target.value }))}
                  placeholder="Internal notes — initial observations, vitals, etc."
                  rows={2}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--nm-accent-indigo)',
                    background: 'var(--nm-bg)', boxShadow: 'var(--nm-shadow-concave)',
                    color: 'var(--nm-text)', fontSize: 13, outline: 'none', resize: 'vertical',
                    fontFamily: "'Satoshi', sans-serif",
                  }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleAddPatient}
              disabled={addFormSubmitting || !addForm.name || !addForm.age || !addForm.symptoms}
              style={{
                width: '100%', marginTop: 18, padding: '12px 0', borderRadius: 14, border: 'none',
                background: addFormSubmitting ? 'var(--nm-shadow-color)' : 'linear-gradient(135deg, var(--nm-accent-indigo), var(--nm-accent-emerald))',
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'General Sans', sans-serif",
                opacity: (!addForm.name || !addForm.age || !addForm.symptoms) ? 0.5 : 1,
                transition: 'all 0.3s ease',
              }}
            >
              {addFormSubmitting ? 'Adding...' : '+ Add Patient Record'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside className="nm-sidebar">
        <div className="nm-sidebar-logo">
          <Heart className="w-5 h-5" />
        </div>

        <nav className="nm-sidebar-nav">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'patients', icon: Users, label: 'Patients' },
            { id: 'settings', icon: Settings, label: 'Configure' },
            { id: 'qrcode', icon: QrCode, label: 'QR Check-In' },
          ].map(item => (
            <button
              key={item.id}
              className={`nm-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
              title={item.label}
              style={{ position: 'relative' }}
            >
              <item.icon className="w-5 h-5" />
              {item.id === 'patients' && pendingCount > 0 && (
                <span style={{
                  position: 'absolute', top: -2, right: -2, width: 16, height: 16,
                  background: '#ef4444', borderRadius: '50%', fontSize: 9,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, animation: 'pulse 2s infinite',
                }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>

        <button
          className="nm-nav-item"
          onClick={onLogout}
          title="Sign Out"
          style={{
            color: '#ef4444',
            marginTop: 'auto',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <LogOut className="w-5 h-5" />
        </button>
      </aside>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="nm-main">
        {/* Header */}
        <header className="nm-header">
          <div className="nm-header-left">
            <div className="nm-breadcrumb">
              <span>SmartER /</span> {activeNav.charAt(0).toUpperCase() + activeNav.slice(1)}
            </div>
            <div className="nm-search">
              <Search className="w-4 h-4" style={{ color: 'var(--nm-text-muted)', flexShrink: 0 }} />
              <input placeholder="Search patients, metrics..." />
            </div>
          </div>
          <div className="nm-header-right">
            <button className="nm-header-btn nm-theme-toggle-inner" onClick={toggleTheme} title="Toggle theme">
              {theme === 'light' ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
            </button>

            {/* Notifications */}
            <button
              className="nm-header-btn"
              title="Notifications"
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              style={{ position: 'relative' }}
            >
              <Bell className="w-[18px] h-[18px]" />
              {notifHistory.length > 0 && <div className="nm-notification-dot" />}
            </button>

            {/* Connection status */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600,
              color: isOnline ? 'var(--nm-accent-emerald)' : 'var(--nm-accent-amber)',
              padding: '4px 8px', borderRadius: 8,
              background: isOnline ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
            }}>
              {isOnline ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
              {isOnline ? 'Live' : 'Local'}
            </div>

            <div className="nm-avatar" title={user?.name}>
              {user?.name?.charAt(0) || 'U'}
            </div>

            {/* Sign Out Button */}
            <button
              onClick={onLogout}
              title="Sign out"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 12, border: 'none',
                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: "var(--nm-font-body)",
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </header>

        {/* Notification Panel Dropdown */}
        {showNotifPanel && (
          <div style={{
            position: 'absolute', top: 64, right: 20, width: 340, maxHeight: 400,
            background: 'var(--nm-bg)', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            zIndex: 8000, overflowY: 'auto', padding: 16,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--nm-text)', marginBottom: 12, fontFamily: "'General Sans', sans-serif" }}>
              Notifications ({notifHistory.length})
            </div>
            {notifHistory.length === 0 && (
              <div style={{ color: 'var(--nm-text-muted)', fontSize: 12, textAlign: 'center', padding: 20 }}>
                No notifications yet
              </div>
            )}
            {notifHistory.map(n => (
              <div key={n.id} style={{
                padding: '10px 12px', borderRadius: 12, marginBottom: 8,
                background: 'var(--nm-highlight)', boxShadow: 'var(--nm-shadow-convex)',
                fontSize: 12, color: 'var(--nm-text)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: n.type === 'patient' ? '#6366f1' : n.type === 'success' ? '#22c55e' : '#f59e0b',
                  }} />
                  <span style={{ fontWeight: 600 }}>{n.message}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--nm-text-muted)' }}>
                  {new Date(n.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Content ── */}
        <div className="nm-content">
          {/* ═══ DASHBOARD VIEW ═══ */}
          {activeNav === 'dashboard' && (
            <>
              {/* Stat Cards */}
              <div className="nm-stats-grid">
                <div className="nm-stat-card" ref={stat1Ref}>
                  <div className="nm-stat-icon-wrap"><Users className="w-5 h-5 stat-icon" style={{ color: 'var(--nm-accent-indigo)' }} /></div>
                  <div className={`nm-stat-value ${stat1Done ? 'counted' : ''}`}>{stat1Value.toLocaleString()}</div>
                  <div className="nm-stat-label">Total Patients</div>
                  <div className="nm-stat-trend up"><TrendingUp className="w-3 h-3" /> +12.5%</div>
                </div>
                <div className="nm-stat-card" ref={stat2Ref}>
                  <div className="nm-stat-icon-wrap"><Zap className="w-5 h-5 stat-icon" style={{ color: 'var(--nm-accent-rose)' }} /></div>
                  <div className={`nm-stat-value ${stat2Done ? 'counted' : ''}`}>{stat2Value}%</div>
                  <div className="nm-stat-label">Critical Patients</div>
                  <div className="nm-stat-trend down"><TrendingDown className="w-3 h-3" /> -3.2%</div>
                </div>
                <div className="nm-stat-card" ref={stat3Ref}>
                  <div className="nm-stat-icon-wrap"><Timer className="w-5 h-5 stat-icon" style={{ color: 'var(--nm-accent-emerald)' }} /></div>
                  <div className={`nm-stat-value ${stat3Done ? 'counted' : ''}`}>{stat3Value}<span style={{ fontSize: 14, color: 'var(--nm-text-muted)' }}>min</span></div>
                  <div className="nm-stat-label">Avg Wait Time</div>
                  <div className="nm-stat-trend up"><TrendingUp className="w-3 h-3" /> +1.8%</div>
                </div>
                <div className="nm-stat-card" ref={stat4Ref}>
                  <div className="nm-stat-icon-wrap"><ShieldCheck className="w-5 h-5 stat-icon" style={{ color: 'var(--nm-accent-amber)' }} /></div>
                  <div className={`nm-stat-value ${stat4Done ? 'counted' : ''}`}>{stat4Value}</div>
                  <div className="nm-stat-label">Exhaustion Events</div>
                  <div className="nm-stat-trend down"><TrendingDown className="w-3 h-3" /> -8.1%</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="nm-quick-actions">
                <button className="nm-action-btn" onClick={() => runSimulation()}>
                  <Play className="w-4 h-4 nm-action-icon" style={{ color: 'var(--nm-accent-emerald)' }} />
                  Run Simulation
                </button>
                <button
                  className="nm-action-btn"
                  disabled={patients.length === 0 || isLiveSimRunning}
                  onClick={async () => {
                    if (patients.length === 0) {
                      addToast('No patients to simulate — add patients first', 'warning');
                      return;
                    }
                    setIsLiveSimRunning(true);
                    addToast(`Running simulation on ${patients.length} live patients...`, 'success');
                    await new Promise(r => setTimeout(r, 800));
                    const { patients: simPatients, surgeHours } = convertLivePatientsToSimulation(patients);
                    const { patients: optimized, resourceUtilization, exhaustionEvents } = optimizeResources(simPatients, config);
                    const hours = Math.max(1, Math.ceil(optimized.length / config.arrivalRate));
                    const hourlyStats = calculateHourlyStats(optimized, hours, surgeHours);
                    const triageBreakdown = {
                      p1: optimized.filter(p => p.triageLevel === 'P1').length,
                      p2: optimized.filter(p => p.triageLevel === 'P2').length,
                      p3: optimized.filter(p => p.triageLevel === 'P3').length,
                      p4: optimized.filter(p => p.triageLevel === 'P4').length,
                    };
                    const avgWaitTime = optimized.length > 0
                      ? Math.round(optimized.reduce((s, p) => s + p.waitTime, 0) / optimized.length)
                      : 0;
                    const peakHour = hourlyStats.length > 0
                      ? hourlyStats.reduce((max, h) => h.arrivals > max.arrivals ? h : max, hourlyStats[0]).hour
                      : 1;
                    const criticalPercent = optimized.length > 0
                      ? Math.round((triageBreakdown.p1 / optimized.length) * 100)
                      : 0;
                    const unmetCount = optimized.filter(p => p.isUnmet).length;
                    const unmetPercent = optimized.length > 0 ? (unmetCount / optimized.length) * 100 : 0;
                    let stressLevel: 'Low' | 'Moderate' | 'Critical' = 'Low';
                    if (unmetPercent > 30 || exhaustionEvents > 10) stressLevel = 'Critical';
                    else if (unmetPercent > 10 || exhaustionEvents > 3) stressLevel = 'Moderate';
                    setLiveSimResult({
                      patients: optimized,
                      hourlyStats,
                      resourceUtilization,
                      summary: {
                        totalPatients: optimized.length,
                        criticalPercent,
                        avgWaitTime,
                        peakHour,
                        resourceExhaustionEvents: exhaustionEvents,
                        stressLevel,
                        triageBreakdown,
                      },
                      monteCarloResults: {
                        iterations: 1,
                        avgWaitTimeMean: avgWaitTime,
                        avgWaitTimeLower: avgWaitTime - 5,
                        avgWaitTimeUpper: avgWaitTime + 5,
                        peakHourDistribution: hourlyStats.map(h => h.arrivals),
                        exhaustionMean: exhaustionEvents,
                        iterationData: [{ iteration: 1, avgWaitTime, peakHour, exhaustionCount: exhaustionEvents }],
                      },
                    });
                    setIsLiveSimRunning(false);
                    addToast(`Live simulation complete — ${optimized.length} patients analyzed`, 'success');
                  }}
                  style={{
                    opacity: patients.length === 0 ? 0.5 : 1,
                    border: patients.length > 0 ? '1px solid rgba(99,102,241,0.3)' : undefined,
                  }}
                >
                  <Activity className="w-4 h-4 nm-action-icon" style={{ color: 'var(--nm-accent-indigo)' }} />
                  {isLiveSimRunning ? 'Simulating...' : `Simulate Live (${patients.length})`}
                </button>
                <button className="nm-action-btn" onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 nm-action-icon" style={{ color: 'var(--nm-accent-amber)' }} />
                  Add Patient
                </button>
                <button className="nm-action-btn" onClick={() => setActiveNav('qrcode')}>
                  <QrCode className="w-4 h-4 nm-action-icon" style={{ color: 'var(--nm-accent-rose)' }} />
                  QR Check-In
                </button>
              </div>

              {/* Incoming Patients Banner */}
              {pendingCount > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(34,197,94,0.15))',
                  border: '1px solid rgba(99,102,241,0.3)', borderRadius: 16, padding: '14px 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 18, animation: 'toastSlideIn 0.4s ease',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: 'pulse 2s infinite',
                    }}>
                      <UserPlus className="w-5 h-5" style={{ color: '#fff' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--nm-text)', fontFamily: "'General Sans', sans-serif" }}>
                        {pendingCount} Pending Patient{pendingCount > 1 ? 's' : ''}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--nm-text-muted)' }}>
                        New intake requests waiting for review
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveNav('patients')}
                    style={{
                      padding: '8px 18px', borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    View All →
                  </button>
                </div>
              )}

              {/* Charts */}
              {(result || liveSimResult) && (
                <Dashboard result={(liveSimResult || result)!} isRunning={isRunning || isLiveSimRunning} progress={progress} />
              )}

              {/* Hardware + Activity */}
              <div className="nm-detail-grid" style={{ marginTop: 20 }}>
                <div className="nm-detail-card">
                  <div className="nm-detail-card-title">
                    <Cpu className="w-5 h-5" style={{ color: 'var(--nm-accent-indigo)' }} /> Hardware Pulse
                  </div>
                  {[
                    { icon: Stethoscope, label: 'Doctor Utilization', value: doctorUtil, cls: 'indigo' },
                    { icon: HardDrive, label: 'ICU Capacity', value: icuUtil, cls: 'emerald' },
                    { icon: Wifi, label: 'Ventilator Load', value: ventUtil, cls: 'rose' },
                    { icon: Server, label: 'Network Load', value: netLoad, cls: 'amber' },
                  ].map(bar => (
                    <div className="nm-progress-item" key={bar.label}>
                      <div className="nm-progress-label">
                        <span><bar.icon className="w-3 h-3 inline mr-1" />{bar.label}</span>
                        <span>{bar.value}%</span>
                      </div>
                      <div className="nm-progress-track">
                        <div className={`nm-progress-fill ${bar.cls}`} style={{ width: `${bar.value}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="nm-terminal">
                    {TERMINAL_LINES.map((line, i) => (
                      <div key={i} className="nm-terminal-line" style={{ animationDelay: `${i * 0.3}s` }}>
                        <span className={line.type}>{line.text}</span>
                      </div>
                    ))}
                    <span className="nm-terminal-cursor">▋</span>
                  </div>
                </div>

                <div className="nm-detail-card">
                  <div className="nm-detail-card-title">
                    <Activity className="w-5 h-5" style={{ color: 'var(--nm-accent-emerald)' }} /> Live Patients
                  </div>
                  {patients.length === 0 ? (
                    <div style={{ color: 'var(--nm-text-muted)', fontSize: 12, textAlign: 'center', padding: 30 }}>
                      <AlertCircle className="w-6 h-6" style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                      No patients yet — add one or scan QR
                    </div>
                  ) : patients.slice(0, 6).map(p => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                      borderBottom: '1px solid rgba(128,128,128,0.1)',
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: urgencyColors[p.urgencyLevel] || '#6366f1',
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--nm-text)' }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--nm-text-muted)' }}>
                          Age {p.age} · Pain {p.painLevel}/10 · {p.urgencyLevel}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, padding: '3px 8px', borderRadius: 8, fontWeight: 600,
                        color: statusColors[p.status], background: `${statusColors[p.status]}15`,
                        border: `1px solid ${statusColors[p.status]}40`,
                      }}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ═══ PATIENTS VIEW ═══ */}
          {activeNav === 'patients' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--nm-text)', fontFamily: "'General Sans', sans-serif" }}>
                  Patient Records ({patients.length})
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="nm-action-btn" onClick={() => setShowAddForm(true)}>
                    <Plus className="w-4 h-4" style={{ color: 'var(--nm-accent-indigo)' }} /> Add Patient
                  </button>
                  {patients.length > 0 && (
                    <button className="nm-action-btn" onClick={clearAll} style={{ color: 'var(--nm-accent-rose)' }}>
                      <Trash2 className="w-4 h-4" /> Clear All
                    </button>
                  )}
                </div>
              </div>

              {patients.length === 0 ? (
                <div className="nm-detail-card" style={{ textAlign: 'center', padding: 60 }}>
                  <Users className="w-10 h-10" style={{ margin: '0 auto 16px', color: 'var(--nm-text-muted)', opacity: 0.3 }} />
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--nm-text)', marginBottom: 6 }}>No patients yet</div>
                  <div style={{ fontSize: 12, color: 'var(--nm-text-muted)', marginBottom: 18 }}>
                    Add a patient manually or have someone scan the QR code
                  </div>
                  <button className="nm-action-btn" onClick={() => setShowAddForm(true)} style={{ margin: '0 auto' }}>
                    <Plus className="w-4 h-4" style={{ color: 'var(--nm-accent-indigo)' }} /> Add First Patient
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {patients.map(p => (
                    <div
                      key={p.id}
                      className="nm-detail-card"
                      style={{ padding: 16, cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onClick={() => setSelectedPatient(selectedPatient?.id === p.id ? null : p)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{
                            width: 44, height: 44, borderRadius: 14,
                            background: `${urgencyColors[p.urgencyLevel]}20`,
                            border: `2px solid ${urgencyColors[p.urgencyLevel]}40`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18,
                          }}>
                            {p.urgencyLevel === 'Emergency' ? '🚨' : p.urgencyLevel === 'Urgent' ? '⚡' : '🟢'}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--nm-text)' }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--nm-text-muted)' }}>
                              Age {p.age} · {p.gender} · Pain {p.painLevel}/10 · {new Date(p.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontSize: 11, padding: '4px 12px', borderRadius: 10, fontWeight: 700,
                            color: statusColors[p.status], background: `${statusColors[p.status]}15`,
                            border: `1px solid ${statusColors[p.status]}40`,
                          }}>{p.status}</span>
                          <span style={{
                            fontSize: 11, padding: '4px 10px', borderRadius: 10, fontWeight: 700,
                            color: urgencyColors[p.urgencyLevel], background: `${urgencyColors[p.urgencyLevel]}15`,
                            border: `1px solid ${urgencyColors[p.urgencyLevel]}40`,
                          }}>{p.urgencyLevel}</span>
                          <Eye className="w-4 h-4" style={{ color: 'var(--nm-text-muted)' }} />
                        </div>
                      </div>

                      {/* Expanded */}
                      {selectedPatient?.id === p.id && (
                        <div style={{
                          marginTop: 16, paddingTop: 16,
                          borderTop: '1px solid rgba(128,128,128,0.15)',
                          animation: 'toastSlideIn 0.3s ease',
                        }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--nm-text-muted)', marginBottom: 2 }}>Symptoms</div>
                              <div style={{ fontSize: 12, color: 'var(--nm-text)' }}>{p.symptoms}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--nm-text-muted)', marginBottom: 2 }}>Phone</div>
                              <div style={{ fontSize: 12, color: 'var(--nm-text)' }}>{p.phone || 'N/A'}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--nm-text-muted)', marginBottom: 2 }}>Allergies</div>
                              <div style={{ fontSize: 12, color: 'var(--nm-text)' }}>{p.allergies || 'None'}</div>
                            </div>
                            {p.existingConditions && (
                              <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ fontSize: 10, color: 'var(--nm-text-muted)', marginBottom: 2 }}>Pre-existing Conditions</div>
                                <div style={{ fontSize: 12, color: 'var(--nm-text)' }}>{p.existingConditions}</div>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: 10 }}>
                            {p.status === 'Pending' && (
                              <button onClick={e => { e.stopPropagation(); updateStatus(p.id, 'Reviewed'); }} style={{
                                flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                                background: 'rgba(99,102,241,0.15)', color: '#6366f1', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              }}>
                                <Clock className="w-4 h-4" /> Mark Reviewed
                              </button>
                            )}
                            {(p.status === 'Pending' || p.status === 'Reviewed') && (
                              <button onClick={e => { e.stopPropagation(); updateStatus(p.id, 'Admitted'); }} style={{
                                flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
                                background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              }}>
                                <CheckCircle2 className="w-4 h-4" /> Admit
                              </button>
                            )}
                            <button onClick={e => { e.stopPropagation(); deletePatient(p.id); }} style={{
                              padding: '8px 14px', borderRadius: 10, border: 'none',
                              background: 'rgba(239,68,68,0.15)', color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ═══ SETTINGS VIEW ═══ */}
          {activeNav === 'settings' && (
            <div className="nm-detail-card" style={{ gridColumn: '1 / -1' }}>
              <ConfigPanel
                config={config}
                onUpdate={updateConfig}
                onRun={() => { runSimulation(); setActiveNav('dashboard'); }}
                isRunning={isRunning}
                progress={progress}
              />
            </div>
          )}

          {/* ═══ QR CODE VIEW ═══ */}
          {activeNav === 'qrcode' && (
            <div className="nm-detail-card" style={{ gridColumn: '1 / -1' }}>
              <QRCodePanel />
            </div>
          )}
        </div>
      </div>

      {/* Toast animation keyframe */}
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
