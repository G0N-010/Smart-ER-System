// PatientIntakeForm — Mobile-first form for patient self-registration via QR code
// Patients scan the QR code and fill in their details on their phone
// Now powered by Supabase for real-time cross-device sync
import React, { useState } from 'react';
import type { PatientRequest } from '../simulation/types';
import {
  Heart, User, Phone, AlertCircle, FileText, CheckCircle2,
  ArrowLeft, Stethoscope, Activity, Shield, Cloud
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PatientIntakeFormProps {
  onBack?: () => void; // Go back to main app (only if on same device)
}

export default function PatientIntakeForm({ onBack }: PatientIntakeFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'Prefer not to say' as PatientRequest['gender'],
    phone: '',
    symptoms: '',
    painLevel: 5,
    allergies: '',
    existingConditions: '',
    urgencyLevel: 'Standard' as PatientRequest['urgencyLevel'],
  });

  const updateField = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    const requestId = `REQ-${Date.now().toString(36).toUpperCase()}`;

    try {
      // Insert into Supabase
      const { error } = await supabase.from('patient_requests').insert({
        id: requestId,
        name: formData.name,
        age: parseInt(formData.age) || 0,
        gender: formData.gender,
        phone: formData.phone,
        symptoms: formData.symptoms,
        pain_level: formData.painLevel,
        allergies: formData.allergies,
        existing_conditions: formData.existingConditions,
        urgency_level: formData.urgencyLevel,
        status: 'Pending',
      });

      if (error) throw error;

      setIsSubmitting(false);
      setIsSubmitted(true);
    } catch (err: unknown) {
      console.error('Supabase insert error:', err);
      // Fallback to localStorage
      const request: PatientRequest = {
        id: requestId,
        name: formData.name,
        age: parseInt(formData.age) || 0,
        gender: formData.gender,
        phone: formData.phone,
        symptoms: formData.symptoms,
        painLevel: formData.painLevel,
        allergies: formData.allergies,
        existingConditions: formData.existingConditions,
        urgencyLevel: formData.urgencyLevel,
        timestamp: Date.now(),
        status: 'Pending',
      };
      const existing = JSON.parse(localStorage.getItem('smarter-patient-requests') || '[]');
      existing.push(request);
      localStorage.setItem('smarter-patient-requests', JSON.stringify(existing));

      setIsSubmitting(false);
      setIsSubmitted(true);
      setSubmitError('Saved locally (cloud sync unavailable)');
    }
  };

  const urgencyColors = {
    Emergency: 'border-red-500/50 bg-red-500/10 text-red-400',
    Urgent: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
    Standard: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  };

  const isStep1Valid = formData.name.trim() && formData.age && parseInt(formData.age) > 0 && parseInt(formData.age) <= 120;
  const isStep2Valid = formData.symptoms.trim().length > 2;

  // ── Success Screen ──
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#0f172a] to-[#0a0f1e] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center animate-fade-in-up">
          <div className="glass-card p-8 rounded-2xl">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 mb-6 mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Request Submitted!</h2>
            <p className="text-slate-400 text-sm mb-6">
              Your details have been sent to the ER triage team. Please wait in the reception area — a nurse will call your name shortly.
            </p>
            <div className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Patient</span>
                <span className="text-xs text-white font-medium">{formData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Urgency</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${urgencyColors[formData.urgencyLevel]}`}>
                  {formData.urgencyLevel}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Pain Level</span>
                <span className="text-xs text-white">{formData.painLevel}/10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Status</span>
                <span className="text-xs text-amber-400 font-medium">⏳ Pending Review</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Sync</span>
                <span className={`text-xs font-medium flex items-center gap-1 ${submitError ? 'text-amber-400' : 'text-emerald-400'}`}>
                  <Cloud className="w-3 h-3" />
                  {submitError ? 'Local only' : 'Cloud synced'}
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { setIsSubmitted(false); setStep(1); setFormData(prev => ({ ...prev, name: '', age: '', symptoms: '' })); }}
                className="btn-neon w-full"
              >
                Submit Another Request
              </button>
              {onBack && (
                <button
                  onClick={onBack}
                  className="w-full py-3 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-sm"
                >
                  Back to Dashboard
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-slate-600 mt-4">
            🔒 This is a simulated system — no real patient data is stored
          </p>
        </div>
      </div>
    );
  }

  // ── Form ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#0f172a] to-[#0a0f1e] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0f1e]/90 backdrop-blur-lg border-b border-slate-800/50">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 border border-emerald-500/30 flex items-center justify-center">
              <Heart className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white">
                Smart<span className="text-emerald-400">ER</span>
              </h1>
              <p className="text-[8px] text-slate-500">Patient Intake Form</p>
            </div>
          </div>
          <Shield className="w-4 h-4 text-emerald-400/50" />
        </div>
      </header>

      {/* Progress bar */}
      <div className="max-w-md mx-auto w-full px-4 pt-4">
        <div className="flex gap-2 mb-1">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  s <= step ? 'bg-emerald-400' : 'bg-slate-700'
                }`}
                style={{ width: s <= step ? '100%' : '0%' }}
              />
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mb-4">Step {step} of 3</p>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-md mx-auto w-full px-4 pb-6">
        {/* ── STEP 1: Personal Info ── */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Personal Information</h2>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="Enter your full name"
                className="login-input"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Age *</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={e => updateField('age', e.target.value)}
                  placeholder="Age"
                  min="1"
                  max="120"
                  className="login-input"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Gender</label>
                <select
                  value={formData.gender}
                  onChange={e => updateField('gender', e.target.value)}
                  className="login-input"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="w-4 h-4 text-slate-500" />
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="login-input pl-11"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!isStep1Valid}
              className="btn-neon w-full mt-4"
            >
              Next — Symptoms
            </button>
          </div>
        )}

        {/* ── STEP 2: Symptoms & Pain ── */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Symptoms & Pain Level</h2>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Describe Your Symptoms *</label>
              <textarea
                value={formData.symptoms}
                onChange={e => updateField('symptoms', e.target.value)}
                placeholder="e.g., chest pain, difficulty breathing, headache, injury..."
                className="login-input min-h-[100px] resize-none"
                rows={4}
                required
                autoFocus
              />
            </div>

            {/* Pain Level Slider */}
            <div>
              <label className="block text-xs text-slate-400 mb-2">
                Pain Level: <span className={`font-bold ${
                  formData.painLevel >= 8 ? 'text-red-400' :
                  formData.painLevel >= 5 ? 'text-amber-400' : 'text-emerald-400'
                }`}>{formData.painLevel}/10</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.painLevel}
                onChange={e => updateField('painLevel', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                <span>Mild</span>
                <span>Moderate</span>
                <span>Severe</span>
              </div>
            </div>

            {/* Urgency Selection */}
            <div>
              <label className="block text-xs text-slate-400 mb-2">How urgent is your situation?</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Standard', 'Urgent', 'Emergency'] as const).map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => updateField('urgencyLevel', level)}
                    className={`py-3 px-2 rounded-xl border text-xs font-bold transition-all ${
                      formData.urgencyLevel === level
                        ? urgencyColors[level] + ' ring-2 ring-offset-2 ring-offset-[#0a0f1e] ' + (
                            level === 'Emergency' ? 'ring-red-500/50' :
                            level === 'Urgent' ? 'ring-amber-500/50' : 'ring-emerald-500/50'
                          )
                        : 'border-slate-700 bg-slate-800/30 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    {level === 'Emergency' ? '🚨' : level === 'Urgent' ? '⚡' : '🟢'} {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-sm"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!isStep2Valid}
                className="flex-1 btn-neon"
              >
                Next — Medical History
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Medical History & Submit ── */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Medical History</h2>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Known Allergies</label>
              <input
                type="text"
                value={formData.allergies}
                onChange={e => updateField('allergies', e.target.value)}
                placeholder="e.g., penicillin, peanuts, latex... (None if N/A)"
                className="login-input"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Existing Medical Conditions</label>
              <textarea
                value={formData.existingConditions}
                onChange={e => updateField('existingConditions', e.target.value)}
                placeholder="e.g., diabetes, hypertension, asthma... (None if N/A)"
                className="login-input min-h-[80px] resize-none"
                rows={3}
              />
            </div>

            {/* Summary Preview */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">Request Preview</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name</span>
                  <span className="text-white">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Age / Gender</span>
                  <span className="text-white">{formData.age} / {formData.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Symptoms</span>
                  <span className="text-white text-right max-w-[200px] truncate">{formData.symptoms}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pain Level</span>
                  <span className={`font-bold ${
                    formData.painLevel >= 8 ? 'text-red-400' :
                    formData.painLevel >= 5 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>{formData.painLevel}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Urgency</span>
                  <span className={`font-bold ${urgencyColors[formData.urgencyLevel]}`}>
                    {formData.urgencyLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-300/80">
                If you are experiencing a life-threatening emergency, please inform the front desk immediately. Do not wait for digital processing.
              </p>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-sm"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 btn-neon flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-800/30 border-t-slate-800 rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Footer */}
      <footer className="max-w-md mx-auto w-full px-4 py-3 text-center">
        <p className="text-[10px] text-slate-600">
          🔒 Simulated system — No real patient data is collected or stored
        </p>
      </footer>
    </div>
  );
}
