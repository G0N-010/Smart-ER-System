// Central simulation state hook
// Manages the entire simulation lifecycle: config → generate → optimize → visualize
import { useState, useCallback } from 'react';
import type {
  HospitalConfig,
  SimulationResult,
  SimulationSummary,
} from '../simulation/types';
import { generatePatients } from '../simulation/patientGenerator';
import { optimizeResources } from '../simulation/optimizer';
import { runMonteCarlo, calculateHourlyStats } from '../simulation/monteCarlo';

interface SimulationState {
  config: HospitalConfig;
  result: SimulationResult | null;
  isRunning: boolean;
  progress: number;
}

export function useSimulation() {
  const [state, setState] = useState<SimulationState>({
    config: {
      doctors: 8,
      icuBeds: 15,
      ventilators: 10,
      simulationHours: 12,
      arrivalRate: 10,
    },
    result: null,
    isRunning: false,
    progress: 0,
  });

  const updateConfig = useCallback((updates: Partial<HospitalConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...updates },
    }));
  }, []);

  const runSimulation = useCallback(async () => {
    setState(prev => ({ ...prev, isRunning: true, progress: 0 }));

    // Simulate async delay for realism (1.5s as specified)
    await new Promise(resolve => setTimeout(resolve, 200));

    const config = state.config;

    // Phase 1: Generate patients (single run for display)
    setState(prev => ({ ...prev, progress: 10 }));
    await new Promise(resolve => setTimeout(resolve, 100));

    const { patients: rawPatients, surgeHours } = generatePatients(config);

    // Phase 2: Optimize resources
    setState(prev => ({ ...prev, progress: 20 }));
    await new Promise(resolve => setTimeout(resolve, 100));

    const { patients, resourceUtilization, exhaustionEvents } = optimizeResources(rawPatients, config);

    // Phase 3: Calculate hourly stats
    setState(prev => ({ ...prev, progress: 30 }));
    await new Promise(resolve => setTimeout(resolve, 100));

    const hourlyStats = calculateHourlyStats(patients, config.simulationHours, surgeHours);

    // Phase 4: Monte Carlo simulation (runs in batches)
    const monteCarloResults = runMonteCarlo(config, (percent) => {
      setState(prev => ({ ...prev, progress: 30 + Math.round(percent * 0.6) }));
    });

    setState(prev => ({ ...prev, progress: 95 }));
    await new Promise(resolve => setTimeout(resolve, 200));

    // Phase 5: Calculate summary
    const triageBreakdown = {
      p1: patients.filter(p => p.triageLevel === 'P1').length,
      p2: patients.filter(p => p.triageLevel === 'P2').length,
      p3: patients.filter(p => p.triageLevel === 'P3').length,
      p4: patients.filter(p => p.triageLevel === 'P4').length,
    };

    const avgWaitTime = patients.length > 0
      ? Math.round(patients.reduce((s, p) => s + p.waitTime, 0) / patients.length)
      : 0;

    const peakHour = hourlyStats.reduce(
      (max, h) => h.arrivals > max.arrivals ? h : max,
      hourlyStats[0]
    ).hour;

    const criticalPercent = patients.length > 0
      ? Math.round((triageBreakdown.p1 / patients.length) * 100)
      : 0;

    // Determine stress level
    let stressLevel: 'Low' | 'Moderate' | 'Critical' = 'Low';
    const unmetCount = patients.filter(p => p.isUnmet).length;
    const unmetPercent = patients.length > 0 ? (unmetCount / patients.length) * 100 : 0;
    if (unmetPercent > 30 || exhaustionEvents > 10) {
      stressLevel = 'Critical';
    } else if (unmetPercent > 10 || exhaustionEvents > 3) {
      stressLevel = 'Moderate';
    }

    const summary: SimulationSummary = {
      totalPatients: patients.length,
      criticalPercent,
      avgWaitTime,
      peakHour,
      resourceExhaustionEvents: exhaustionEvents,
      stressLevel,
      triageBreakdown,
    };

    const result: SimulationResult = {
      patients,
      hourlyStats,
      resourceUtilization,
      summary,
      monteCarloResults,
    };

    setState(prev => ({
      ...prev,
      result,
      isRunning: false,
      progress: 100,
    }));
  }, [state.config]);

  return {
    config: state.config,
    result: state.result,
    isRunning: state.isRunning,
    progress: state.progress,
    updateConfig,
    runSimulation,
  };
}
