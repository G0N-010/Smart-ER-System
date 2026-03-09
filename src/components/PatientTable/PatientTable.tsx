// Patient Queue Table — Scrollable with pagination
import React, { useState } from 'react';
import type { Patient } from '../../simulation/types';
import { TRIAGE_CONFIG } from '../../constants/medicalData';
import { ChevronLeft, ChevronRight, Info, Users } from 'lucide-react';

interface PatientTableProps {
  patients: Patient[];
}

const PAGE_SIZE = 20;

export default function PatientTable({ patients }: PatientTableProps) {
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.ceil(patients.length / PAGE_SIZE);
  const visiblePatients = patients.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="glass-card p-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Patient Queue</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
            {patients.length} patients
          </span>
        </div>
        {/* Pagination */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            id="patient-table-prev"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-slate-500 tabular-nums min-w-[60px] text-center">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            id="patient-table-next"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">ID</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Age</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Condition</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Score</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Triage</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Wait</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Resource</th>
              <th className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody>
            {visiblePatients.map((patient) => {
              const triageInfo = TRIAGE_CONFIG[patient.triageLevel];
              const isExpanded = expandedId === patient.id;

              return (
                <React.Fragment key={patient.id}>
                  <tr className={`border-b border-slate-800/50 ${patient.isUnmet ? 'unmet-row' : 'patient-row'}`}>
                    <td className="px-3 py-2.5 text-xs font-mono text-slate-300">{patient.id}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-300">{patient.age}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-300 max-w-[140px] truncate">{patient.condition}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-bold" style={{ color: triageInfo.color }}>
                        {patient.severityScore}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={triageInfo.bgClass}>{patient.triageLevel}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-300">{formatTime(patient.waitTime)}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {patient.isUnmet ? (
                        <span className="text-red-400 font-medium">❌ Unmet</span>
                      ) : (
                        <span className="text-emerald-400">{patient.resourceAssigned}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : patient.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-700 text-slate-500 hover:text-emerald-400 transition-all"
                        title="Explain This Decision"
                        id={`explain-${patient.id}`}
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                  {/* Explainability row */}
                  {isExpanded && (
                    <tr className="animate-fade-in">
                      <td colSpan={8} className="px-4 py-3 bg-slate-800/30">
                        <div className="text-xs text-slate-400 leading-relaxed">
                          <span className="text-emerald-400 font-medium">💡 Decision Explanation: </span>
                          {patient.explanation}
                        </div>
                        <div className="flex gap-4 mt-2 text-[10px] text-slate-500">
                          <span>Age Weight: <strong className="text-slate-300">{patient.ageWeight}</strong></span>
                          <span>Condition Weight: <strong className="text-slate-300">{patient.conditionWeight}</strong></span>
                          <span>Random Risk: <strong className="text-slate-300">{patient.randomRisk.toFixed(2)}</strong></span>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {patients.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-slate-500">No patients to display. Run a simulation first.</p>
        </div>
      )}
    </div>
  );
}
