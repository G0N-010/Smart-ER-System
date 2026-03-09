// Hospital Configuration Panel — Left sidebar with sliders
import type { HospitalConfig } from '../../simulation/types';
import { Stethoscope, BedDouble, Wind, Clock, Users, Play, Settings } from 'lucide-react';

interface ConfigPanelProps {
  config: HospitalConfig;
  onUpdate: (updates: Partial<HospitalConfig>) => void;
  onRun: () => void;
  isRunning: boolean;
  progress: number;
}

interface SliderConfig {
  key: keyof HospitalConfig;
  label: string;
  min: number;
  max: number;
  icon: React.ReactNode;
  unit: string;
  tooltip: string;
}

const sliders: SliderConfig[] = [
  {
    key: 'doctors',
    label: 'Doctors',
    min: 1,
    max: 20,
    icon: <Stethoscope className="w-4 h-4" />,
    unit: '',
    tooltip: 'Number of physicians available to treat patients',
  },
  {
    key: 'icuBeds',
    label: 'ICU Beds',
    min: 1,
    max: 50,
    icon: <BedDouble className="w-4 h-4" />,
    unit: '',
    tooltip: 'Intensive Care Unit beds for critical patients',
  },
  {
    key: 'ventilators',
    label: 'Ventilators',
    min: 1,
    max: 30,
    icon: <Wind className="w-4 h-4" />,
    unit: '',
    tooltip: 'Mechanical ventilators for respiratory failure cases',
  },
  {
    key: 'simulationHours',
    label: 'Duration',
    min: 1,
    max: 24,
    icon: <Clock className="w-4 h-4" />,
    unit: 'hrs',
    tooltip: 'Length of the simulation in hours',
  },
  {
    key: 'arrivalRate',
    label: 'Arrival Rate',
    min: 1,
    max: 30,
    icon: <Users className="w-4 h-4" />,
    unit: '/hr',
    tooltip: 'Average patients arriving per hour (Poisson distributed)',
  },
];

export default function ConfigPanel({ config, onUpdate, onRun, isRunning, progress }: ConfigPanelProps) {
  return (
    <div className="glass-card p-5 animate-slide-in-left h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 border border-emerald-500/30 flex items-center justify-center">
          <Settings className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Hospital Config</h2>
          <p className="text-xs text-slate-500">Adjust parameters below</p>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-5">
        {sliders.map((slider) => (
          <div key={slider.key} className="tooltip-container">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">{slider.icon}</span>
                <span className="text-sm font-medium text-slate-300">{slider.label}</span>
              </div>
              <span className="text-sm font-bold text-emerald-400 tabular-nums">
                {config[slider.key]}{slider.unit}
              </span>
            </div>
            <input
              type="range"
              min={slider.min}
              max={slider.max}
              value={config[slider.key]}
              onChange={(e) => onUpdate({ [slider.key]: Number(e.target.value) })}
              className="w-full"
              id={`slider-${slider.key}`}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-slate-600">{slider.min}</span>
              <span className="text-[10px] text-slate-600">{slider.max}</span>
            </div>
            <div className="tooltip-content">{slider.tooltip}</div>
          </div>
        ))}
      </div>

      {/* Run Button */}
      <div className="mt-8">
        <button
          onClick={onRun}
          disabled={isRunning}
          className="btn-neon w-full flex items-center justify-center gap-2"
          id="run-simulation-button"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-800/30 border-t-slate-800 rounded-full animate-spin"></div>
              Running... {progress}%
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Simulation
            </>
          )}
        </button>

        {/* Progress bar */}
        {isRunning && (
          <div className="mt-3 animate-fade-in">
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 text-center">
              {progress < 30 ? 'Generating patients...' :
               progress < 90 ? `Monte Carlo simulation (${progress}%)...` :
               'Finalizing results...'}
            </p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="mt-6 p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          💡 <strong className="text-slate-400">Tip:</strong> Higher arrival rates with fewer doctors will show resource exhaustion patterns. Try extreme values for stress testing.
        </p>
      </div>
    </div>
  );
}
