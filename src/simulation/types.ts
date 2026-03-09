// All shared TypeScript types for the ER Triage Simulator
// NOTE: Scalability — these types could be extended to connect to real hospital APIs
// by adding fields like hospitalId, realPatientId (anonymized), and API response types.

export type TriageLevel = 'P1' | 'P2' | 'P3' | 'P4';

export type MedicalCondition =
  | 'Cardiac Arrest'
  | 'Respiratory Failure'
  | 'Stroke'
  | 'Severe Trauma'
  | 'Chest Pain'
  | 'Fracture'
  | 'Fever'
  | 'Minor Laceration';

export interface Patient {
  id: string;
  arrivalTime: number;        // minutes from simulation start
  age: number;                // 1–90
  condition: MedicalCondition;
  severityScore: number;      // 0–100
  triageLevel: TriageLevel;
  waitTime: number;           // calculated in minutes
  resourceAssigned: string | null;
  isUnmet: boolean;           // true if no resource available
  // Explainability fields
  ageWeight: number;
  conditionWeight: number;
  randomRisk: number;
  explanation: string;
}

export interface HospitalConfig {
  doctors: number;
  icuBeds: number;
  ventilators: number;
  simulationHours: number;
  arrivalRate: number;        // patients per hour
}

export interface SimulationResult {
  patients: Patient[];
  hourlyStats: HourlyStats[];
  resourceUtilization: ResourceUtilization;
  summary: SimulationSummary;
  monteCarloResults: MonteCarloOutput;
}

export interface HourlyStats {
  hour: number;
  arrivals: number;
  avgWaitTime: number;
  isSurge: boolean;
}

export interface ResourceUtilization {
  doctorsUsed: number;
  doctorsAvailable: number;
  icuUsed: number;
  icuAvailable: number;
  ventilatorsUsed: number;
  ventilatorsAvailable: number;
}

export interface SimulationSummary {
  totalPatients: number;
  criticalPercent: number;
  avgWaitTime: number;
  peakHour: number;
  resourceExhaustionEvents: number;
  stressLevel: 'Low' | 'Moderate' | 'Critical';
  triageBreakdown: {
    p1: number;
    p2: number;
    p3: number;
    p4: number;
  };
}

export interface MonteCarloOutput {
  iterations: number;
  avgWaitTimeMean: number;
  avgWaitTimeLower: number;  // 95% CI lower
  avgWaitTimeUpper: number;  // 95% CI upper
  peakHourDistribution: number[];
  exhaustionMean: number;
  iterationData: MonteCarloIteration[];
}

export interface MonteCarloIteration {
  iteration: number;
  avgWaitTime: number;
  peakHour: number;
  exhaustionCount: number;
}

export interface UserCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginState {
  isAuthenticated: boolean;
  user: {
    name: string;
    role: string;
    avatar: string;
  } | null;
}

// Patient self-registration via QR code intake form
export interface PatientRequest {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  phone: string;
  symptoms: string;
  painLevel: number;         // 1–10
  allergies: string;
  existingConditions: string;
  urgencyLevel: 'Emergency' | 'Urgent' | 'Standard';
  timestamp: number;         // Date.now()
  status: 'Pending' | 'Reviewed' | 'Admitted';
}

