// Patient Scenario Generator — uses Poisson distribution for arrival times
import type { Patient, MedicalCondition, HospitalConfig } from './types';
import { CONDITIONS, CONDITION_WEIGHTS, getAgeWeight, SURGE_MULTIPLIER, SURGE_PROBABILITY } from '../constants/medicalData';
import { calculateSeverityScore, assignTriageLevel } from './severityEngine';

// Poisson distribution — generates number of events for a given rate (lambda)
function poissonRandom(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// Generate a random integer in [min, max]
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pick a weighted random condition — higher weight conditions are rarer
function pickCondition(): MedicalCondition {
  const weights = CONDITIONS.map(c => {
    const w = CONDITION_WEIGHTS[c];
    // Inverse weight so severe conditions are rarer
    return 100 - w + 10; // +10 to avoid zero probability
  });
  const total = weights.reduce((sum, w) => sum + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < CONDITIONS.length; i++) {
    r -= weights[i];
    if (r <= 0) return CONDITIONS[i];
  }
  return CONDITIONS[CONDITIONS.length - 1];
}

// Generate all patients for a simulation run
export function generatePatients(config: HospitalConfig): {
  patients: Patient[];
  surgeHours: number[];
} {
  const patients: Patient[] = [];
  const surgeHours: number[] = [];
  let patientId = 1;

  for (let hour = 0; hour < config.simulationHours; hour++) {
    // Determine if this hour has a surge event
    const isSurge = Math.random() < SURGE_PROBABILITY;
    if (isSurge) surgeHours.push(hour);

    const effectiveRate = isSurge
      ? config.arrivalRate * SURGE_MULTIPLIER
      : config.arrivalRate;

    // Poisson-distributed arrivals for this hour
    const arrivals = poissonRandom(effectiveRate);

    for (let i = 0; i < arrivals; i++) {
      const arrivalMinute = hour * 60 + randInt(0, 59);
      const age = randInt(1, 90);
      const condition = pickCondition();
      const randomRisk = Math.random();

      const ageWeight = getAgeWeight(age);
      const conditionWeight = CONDITION_WEIGHTS[condition];
      const severityScore = calculateSeverityScore(ageWeight, conditionWeight, randomRisk);
      const triageLevel = assignTriageLevel(severityScore);

      // Build explanation for explainability
      const explanation = buildExplanation(age, ageWeight, condition, conditionWeight, randomRisk, severityScore, triageLevel);

      patients.push({
        id: `PT-${String(patientId).padStart(4, '0')}`,
        arrivalTime: arrivalMinute,
        age,
        condition,
        severityScore,
        triageLevel,
        waitTime: 0, // will be set by optimizer
        resourceAssigned: null,
        isUnmet: false,
        ageWeight,
        conditionWeight,
        randomRisk,
        explanation,
      });

      patientId++;
    }
  }

  // Sort patients by arrival time
  patients.sort((a, b) => a.arrivalTime - b.arrivalTime);

  return { patients, surgeHours };
}

function buildExplanation(
  age: number,
  ageWeight: number,
  condition: MedicalCondition,
  conditionWeight: number,
  randomRisk: number,
  score: number,
  level: string
): string {
  const ageRisk = ageWeight >= 70 ? 'high' : ageWeight >= 40 ? 'moderate' : 'low';
  const condRisk = conditionWeight >= 80 ? 'High-risk' : conditionWeight >= 50 ? 'Moderate-risk' : 'Low-risk';
  
  return `Patient assigned ${level} — Score: ${score}. ${condRisk} condition (${condition}: ${conditionWeight}) combined with age factor (${age} years: ${ageRisk}) and ${randomRisk >= 0.7 ? 'elevated' : 'normal'} random risk (${randomRisk.toFixed(2)}).`;
}
