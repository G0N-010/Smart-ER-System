// Medical conditions and their weights — used exactly as specified in guidelines
import type { MedicalCondition } from '../simulation/types';

export const CONDITION_WEIGHTS: Record<MedicalCondition, number> = {
  'Cardiac Arrest': 95,
  'Respiratory Failure': 90,
  'Stroke': 85,
  'Severe Trauma': 80,
  'Chest Pain': 70,
  'Fracture': 45,
  'Fever': 25,
  'Minor Laceration': 15,
};

export const CONDITIONS: MedicalCondition[] = Object.keys(CONDITION_WEIGHTS) as MedicalCondition[];

// Age weight: older patients get higher weight (0–100 scale)
export function getAgeWeight(age: number): number {
  if (age >= 75) return 90;
  if (age >= 60) return 70;
  if (age >= 45) return 50;
  if (age >= 18) return 30;
  if (age >= 5) return 40; // Children get slightly higher priority
  return 60; // Infants/toddlers get high priority
}

// Triage color labels for UI
export const TRIAGE_CONFIG = {
  P1: { label: 'Critical', color: '#ff4444', bgClass: 'badge-p1' },
  P2: { label: 'Urgent', color: '#ff8c00', bgClass: 'badge-p2' },
  P3: { label: 'Semi-Urgent', color: '#ffd700', bgClass: 'badge-p3' },
  P4: { label: 'Non-Urgent', color: '#00cc44', bgClass: 'badge-p4' },
} as const;

// Monte Carlo configuration
export const MONTE_CARLO_ITERATIONS = 500;
export const MONTE_CARLO_BATCH_SIZE = 50;

// Surge event configuration
export const SURGE_MULTIPLIER = 2.5;
export const SURGE_PROBABILITY = 0.15; // 15% chance per hour of a surge event

// Demo users for login (simulated — no real authentication)
export const DEMO_USERS = [
  {
    username: 'admin',
    password: 'admin123',
    name: 'Dr. Sarah Chen',
    role: 'Chief Medical Officer',
    avatar: '👩‍⚕️',
  },
  {
    username: 'doctor',
    password: 'doctor123',
    name: 'Dr. James Wilson',
    role: 'Emergency Physician',
    avatar: '👨‍⚕️',
  },
  {
    username: 'nurse',
    password: 'nurse123',
    name: 'Nurse Maria Santos',
    role: 'Charge Nurse',
    avatar: '👩‍⚕️',
  },
  {
    username: 'demo',
    password: 'demo',
    name: 'Demo User',
    role: 'Observer',
    avatar: '🏥',
  },
];
