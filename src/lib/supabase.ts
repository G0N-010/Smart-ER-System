// Supabase client configuration for SmartER
import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://nxyfotoimhnsuohjhupc.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOnN1cGFiYXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzU2MDAsImV4cCI6MjA4ODU1MTYwMH0.wcca386jQs8VMeYKwqFyfoDdnKh44D8Ofx4ROoME1bU';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Database row type (matches Supabase table schema)
export interface PatientRequestRow {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  phone: string;
  symptoms: string;
  pain_level: number;
  allergies: string;
  existing_conditions: string;
  urgency_level: 'Emergency' | 'Urgent' | 'Standard';
  status: 'Pending' | 'Reviewed' | 'Admitted';
  created_at: string;
}

// Convert DB row to app type
export function rowToPatientRequest(row: PatientRequestRow) {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    gender: row.gender,
    phone: row.phone,
    symptoms: row.symptoms,
    painLevel: row.pain_level,
    allergies: row.allergies,
    existingConditions: row.existing_conditions,
    urgencyLevel: row.urgency_level,
    timestamp: new Date(row.created_at).getTime(),
    status: row.status,
  };
}
