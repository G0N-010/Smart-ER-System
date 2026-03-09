// Main Dashboard — Orchestrates all visualization components

import type { SimulationResult } from '../../simulation/types';
import TriageChart from '../Charts/TriageChart';
import WaitTimeChart from '../Charts/WaitTimeChart';
import ResourceChart from '../Charts/ResourceChart';
import ArrivalChart from '../Charts/ArrivalChart';
import MonteCarloChart from '../Charts/MonteCarloChart';
import PatientTable from '../PatientTable/PatientTable';
import SummaryCard from '../SummaryCard/SummaryCard';
import { Activity } from 'lucide-react';

interface DashboardProps {
  result: SimulationResult | null;
  isRunning: boolean;
  progress: number;
}

export default function Dashboard({ result, isRunning, progress }: DashboardProps) {
  // Loading state
  if (isRunning) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in">
        <div className="relative">
          <div className="spinner"></div>
          <Activity className="w-5 h-5 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-heartbeat" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-white mb-1">Running Simulation</p>
          <p className="text-xs text-slate-500">
            {progress < 20 && 'Generating synthetic patients...'}
            {progress >= 20 && progress < 30 && 'Optimizing resource allocation...'}
            {progress >= 30 && progress < 90 && `Monte Carlo simulation — ${progress}% complete`}
            {progress >= 90 && 'Compiling results...'}
          </p>
          <div className="w-48 h-1.5 bg-slate-800 rounded-full mt-3 mx-auto overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400/10 to-cyan-400/10 border border-emerald-500/20 flex items-center justify-center">
          <Activity className="w-10 h-10 text-emerald-400/40" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-400 mb-1">No Simulation Data</p>
          <p className="text-xs text-slate-600">Configure hospital parameters and click "Run Simulation" to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary Card */}
      <SummaryCard summary={result.summary} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <TriageChart summary={result.summary} />
        </div>
        <WaitTimeChart hourlyStats={result.hourlyStats} />
        <ResourceChart utilization={result.resourceUtilization} />
        <ArrivalChart hourlyStats={result.hourlyStats} />
      </div>

      {/* Monte Carlo — Full width */}
      <MonteCarloChart mcData={result.monteCarloResults} />

      {/* Patient Table */}
      <PatientTable patients={result.patients} />
    </div>
  );
}
