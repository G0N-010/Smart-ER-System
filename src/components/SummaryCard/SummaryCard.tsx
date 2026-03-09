// Simulation Summary Card — Post-simulation metrics overview
// Now with dynamic count-up animations triggered on scroll into viewport

import type { SimulationSummary } from '../../simulation/types';
import { Activity, AlertTriangle, Clock, TrendingUp, Zap, Users, BarChart3 } from 'lucide-react';
import { useCountUp } from '../../hooks/useCountUp';

interface SummaryCardProps {
  summary: SimulationSummary;
}

// Individual animated metric with count-up
function AnimatedMetric({
  value,
  suffix,
  prefix,
  decimals,
  label,
  icon,
  color,
  tooltip,
  delay,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  label: string;
  icon: React.ReactNode;
  color: string;
  tooltip: string;
  delay: number;
}) {
  const { count, ref, hasStarted } = useCountUp({
    end: value,
    duration: 2000,
    delay,
    decimals: decimals ?? 0,
  });

  return (
    <div
      ref={ref}
      className="tooltip-container p-3 rounded-xl bg-slate-800/50 border border-slate-700/30 hover:border-slate-600 transition-all group"
    >
      <div className={`${color} mb-1.5`}>{icon}</div>
      <div
        className={`text-2xl font-bold ${color} tabular-nums transition-all duration-500 ${
          hasStarted ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-3 opacity-0 scale-90'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
      <div className="tooltip-content">{tooltip}</div>
    </div>
  );
}

export default function SummaryCard({ summary }: SummaryCardProps) {
  const stressColors = {
    Low: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    Moderate: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
    Critical: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', glow: 'shadow-red-500/20' },
  };

  const stress = stressColors[summary.stressLevel];

  const metrics = [
    {
      label: 'Total Patients',
      value: summary.totalPatients,
      suffix: '',
      prefix: '',
      decimals: 0,
      icon: <Users className="w-4 h-4" />,
      color: 'text-cyan-400',
      tooltip: 'Total patients generated in this simulation run',
    },
    {
      label: 'Critical %',
      value: summary.criticalPercent,
      suffix: '%',
      prefix: '',
      decimals: 0,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: summary.criticalPercent > 20 ? 'text-red-400' : 'text-amber-400',
      tooltip: 'Percentage of P1 (Critical) patients',
    },
    {
      label: 'Avg Wait Time',
      value: summary.avgWaitTime,
      suffix: 'm',
      prefix: '',
      decimals: 0,
      icon: <Clock className="w-4 h-4" />,
      color: summary.avgWaitTime > 60 ? 'text-red-400' : summary.avgWaitTime > 30 ? 'text-amber-400' : 'text-emerald-400',
      tooltip: 'Average wait time across all patients',
    },
    {
      label: 'Peak Hour',
      value: summary.peakHour,
      suffix: '',
      prefix: 'Hour ',
      decimals: 0,
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'text-purple-400',
      tooltip: 'Hour with the highest number of arrivals',
    },
    {
      label: 'Exhaustion Events',
      value: summary.resourceExhaustionEvents,
      suffix: '',
      prefix: '',
      decimals: 0,
      icon: <Zap className="w-4 h-4" />,
      color: summary.resourceExhaustionEvents > 5 ? 'text-red-400' : 'text-amber-400',
      tooltip: 'Times a resource (doctors, ICU, ventilators) was completely depleted',
    },
  ];

  return (
    <div className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Simulation Summary</h3>
        </div>
        {/* Stress Level Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${stress.bg} ${stress.border} border shadow-lg ${stress.glow}`}>
          <Activity className={`w-3.5 h-3.5 ${stress.text} ${summary.stressLevel === 'Critical' ? 'animate-heartbeat' : ''}`} />
          <span className={`text-xs font-bold ${stress.text}`}>
            {summary.stressLevel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {metrics.map((metric, index) => (
          <AnimatedMetric
            key={metric.label}
            value={metric.value}
            suffix={metric.suffix}
            prefix={metric.prefix}
            decimals={metric.decimals}
            label={metric.label}
            icon={metric.icon}
            color={metric.color}
            tooltip={metric.tooltip}
            delay={index * 150}
          />
        ))}
      </div>

      {/* Triage breakdown mini bar */}
      <div className="mt-4 pt-3 border-t border-slate-700/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-slate-500">Triage Distribution</span>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          {summary.totalPatients > 0 && (
            <>
              <div
                className="bg-red-500 rounded-l-full transition-all duration-500"
                style={{ width: `${(summary.triageBreakdown.p1 / summary.totalPatients) * 100}%` }}
                title={`P1: ${summary.triageBreakdown.p1}`}
              ></div>
              <div
                className="bg-orange-500 transition-all duration-500"
                style={{ width: `${(summary.triageBreakdown.p2 / summary.totalPatients) * 100}%` }}
                title={`P2: ${summary.triageBreakdown.p2}`}
              ></div>
              <div
                className="bg-yellow-500 transition-all duration-500"
                style={{ width: `${(summary.triageBreakdown.p3 / summary.totalPatients) * 100}%` }}
                title={`P3: ${summary.triageBreakdown.p3}`}
              ></div>
              <div
                className="bg-green-500 rounded-r-full transition-all duration-500"
                style={{ width: `${(summary.triageBreakdown.p4 / summary.totalPatients) * 100}%` }}
                title={`P4: ${summary.triageBreakdown.p4}`}
              ></div>
            </>
          )}
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-600">
          <span>🔴 P1: {summary.triageBreakdown.p1}</span>
          <span>🟠 P2: {summary.triageBreakdown.p2}</span>
          <span>🟡 P3: {summary.triageBreakdown.p3}</span>
          <span>🟢 P4: {summary.triageBreakdown.p4}</span>
        </div>
      </div>
    </div>
  );
}
