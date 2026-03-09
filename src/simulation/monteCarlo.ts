// Monte Carlo Simulation Module
// Runs 500+ iterations with different random seeds
// Outputs mean + 95% confidence interval
import type { HospitalConfig, MonteCarloOutput, MonteCarloIteration, HourlyStats } from './types';
import { generatePatients } from './patientGenerator';
import { optimizeResources } from './optimizer';
import { MONTE_CARLO_ITERATIONS } from '../constants/medicalData';

export function runMonteCarlo(
  config: HospitalConfig,
  onProgress?: (percent: number) => void
): MonteCarloOutput {
  const iterations: MonteCarloIteration[] = [];

  for (let i = 0; i < MONTE_CARLO_ITERATIONS; i++) {
    const { patients } = generatePatients(config);
    const result = optimizeResources(patients, config);

    // Calculate stats for this iteration
    const avgWaitTime = result.patients.length > 0
      ? result.patients.reduce((sum, p) => sum + p.waitTime, 0) / result.patients.length
      : 0;

    // Find peak hour
    const hourCounts: number[] = new Array(config.simulationHours).fill(0);
    result.patients.forEach(p => {
      const hour = Math.floor(p.arrivalTime / 60);
      if (hour < config.simulationHours) hourCounts[hour]++;
    });
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

    iterations.push({
      iteration: i + 1,
      avgWaitTime: Math.round(avgWaitTime * 100) / 100,
      peakHour,
      exhaustionCount: result.exhaustionEvents,
    });

    // Report progress in batches
    if (onProgress && (i + 1) % 50 === 0) {
      onProgress(Math.round(((i + 1) / MONTE_CARLO_ITERATIONS) * 100));
    }
  }

  // Calculate statistics
  const waitTimes = iterations.map(it => it.avgWaitTime).sort((a, b) => a - b);
  const mean = waitTimes.reduce((s, v) => s + v, 0) / waitTimes.length;
  
  // 95% confidence interval
  const stdDev = Math.sqrt(
    waitTimes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / waitTimes.length
  );
  const marginOfError = 1.96 * (stdDev / Math.sqrt(waitTimes.length));

  // Peak hour distribution
  const peakHourDist = new Array(config.simulationHours).fill(0);
  iterations.forEach(it => {
    if (it.peakHour >= 0 && it.peakHour < config.simulationHours) {
      peakHourDist[it.peakHour]++;
    }
  });

  const exhaustionMean = iterations.reduce((s, it) => s + it.exhaustionCount, 0) / iterations.length;

  return {
    iterations: MONTE_CARLO_ITERATIONS,
    avgWaitTimeMean: Math.round(mean * 100) / 100,
    avgWaitTimeLower: Math.round((mean - marginOfError) * 100) / 100,
    avgWaitTimeUpper: Math.round((mean + marginOfError) * 100) / 100,
    peakHourDistribution: peakHourDist,
    exhaustionMean: Math.round(exhaustionMean * 100) / 100,
    iterationData: iterations,
  };
}

// Calculate hourly stats from a single simulation run
export function calculateHourlyStats(
  patients: import('./types').Patient[],
  simulationHours: number,
  surgeHours: number[]
): HourlyStats[] {
  const stats: HourlyStats[] = [];

  for (let hour = 0; hour < simulationHours; hour++) {
    const hourPatients = patients.filter(p => {
      const h = Math.floor(p.arrivalTime / 60);
      return h === hour;
    });

    const avgWait = hourPatients.length > 0
      ? hourPatients.reduce((s, p) => s + p.waitTime, 0) / hourPatients.length
      : 0;

    stats.push({
      hour: hour + 1,
      arrivals: hourPatients.length,
      avgWaitTime: Math.round(avgWait * 100) / 100,
      isSurge: surgeHours.includes(hour),
    });
  }

  return stats;
}
