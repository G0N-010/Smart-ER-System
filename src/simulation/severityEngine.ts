// Severity Scoring Engine — assigns triage levels using weighted scoring formula
// Formula: Score = (Age Weight × 0.25) + (Condition Weight × 0.45) + (Random Risk Factor × 0.30)
import type { TriageLevel } from './types';

export function calculateSeverityScore(
  ageWeight: number,
  conditionWeight: number,
  randomRiskFactor: number
): number {
  const score = Math.round(
    ageWeight * 0.25 +
    conditionWeight * 0.45 +
    randomRiskFactor * 100 * 0.30
  );
  // Clamp to 0–100
  return Math.max(0, Math.min(100, score));
}

export function assignTriageLevel(score: number): TriageLevel {
  if (score >= 80) return 'P1';
  if (score >= 60) return 'P2';
  if (score >= 40) return 'P3';
  return 'P4';
}
