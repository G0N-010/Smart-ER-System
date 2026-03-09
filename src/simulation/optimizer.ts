// Resource Optimization Engine — Greedy algorithm for resource allocation
// Priority: P1 → P2 → P3 → P4
// P1: Doctor + ICU Bed + Ventilator (if respiratory)
// P2: Doctor only
// P3: Doctor if available
// P4: Queue, assign only if all others served
import type { Patient, HospitalConfig, ResourceUtilization } from './types';

export interface OptimizationResult {
  patients: Patient[];
  resourceUtilization: ResourceUtilization;
  exhaustionEvents: number;
}

export function optimizeResources(
  patients: Patient[],
  config: HospitalConfig
): OptimizationResult {
  // Clone patients to avoid mutation
  const allocated = patients.map(p => ({ ...p }));
  
  let availableDoctors = config.doctors;
  let availableICU = config.icuBeds;
  let availableVentilators = config.ventilators;
  let exhaustionEvents = 0;

  // Track peak usage
  let doctorsUsed = 0;
  let icuUsed = 0;
  let ventilatorsUsed = 0;

  // Sort by triage level priority (P1 first, then P2, P3, P4)
  // Within same triage, sort by arrival time
  const prioritySorted = [...allocated].sort((a, b) => {
    const priorityOrder = { P1: 0, P2: 1, P3: 2, P4: 3 };
    const pDiff = priorityOrder[a.triageLevel] - priorityOrder[b.triageLevel];
    if (pDiff !== 0) return pDiff;
    return a.arrivalTime - b.arrivalTime;
  });

  for (const patient of prioritySorted) {
    const idx = allocated.findIndex(p => p.id === patient.id);
    if (idx === -1) continue;

    switch (patient.triageLevel) {
      case 'P1': {
        // P1: Doctor + ICU Bed + Ventilator (if respiratory)
        const needsVent = patient.condition === 'Respiratory Failure' || patient.condition === 'Cardiac Arrest';
        
        if (availableDoctors > 0 && availableICU > 0) {
          availableDoctors--;
          availableICU--;
          doctorsUsed++;
          icuUsed++;
          
          let resource = 'Doctor + ICU Bed';
          
          if (needsVent && availableVentilators > 0) {
            availableVentilators--;
            ventilatorsUsed++;
            resource += ' + Ventilator';
          } else if (needsVent && availableVentilators <= 0) {
            exhaustionEvents++;
          }
          
          allocated[idx].resourceAssigned = resource;
          allocated[idx].isUnmet = false;
          allocated[idx].waitTime = Math.floor(Math.random() * 10 + 5); // 5-15 min for P1
        } else {
          allocated[idx].isUnmet = true;
          allocated[idx].resourceAssigned = null;
          allocated[idx].waitTime = Math.floor(Math.random() * 30 + 45); // 45-75 min if unmet
          if (availableDoctors <= 0) exhaustionEvents++;
          if (availableICU <= 0) exhaustionEvents++;
        }
        break;
      }
      case 'P2': {
        // P2: Doctor only
        if (availableDoctors > 0) {
          availableDoctors--;
          doctorsUsed++;
          allocated[idx].resourceAssigned = 'Doctor';
          allocated[idx].isUnmet = false;
          allocated[idx].waitTime = Math.floor(Math.random() * 20 + 15); // 15-35 min
        } else {
          allocated[idx].isUnmet = true;
          allocated[idx].resourceAssigned = null;
          allocated[idx].waitTime = Math.floor(Math.random() * 40 + 30); // 30-70 min if unmet
          exhaustionEvents++;
        }
        break;
      }
      case 'P3': {
        // P3: Doctor if available
        if (availableDoctors > 0) {
          availableDoctors--;
          doctorsUsed++;
          allocated[idx].resourceAssigned = 'Doctor';
          allocated[idx].isUnmet = false;
          allocated[idx].waitTime = Math.floor(Math.random() * 30 + 30); // 30-60 min
        } else {
          allocated[idx].isUnmet = true;
          allocated[idx].resourceAssigned = null;
          allocated[idx].waitTime = Math.floor(Math.random() * 60 + 60); // 60-120 min if unmet
        }
        break;
      }
      case 'P4': {
        // P4: Queue, assign only if all others served
        if (availableDoctors > 0) {
          availableDoctors--;
          doctorsUsed++;
          allocated[idx].resourceAssigned = 'Doctor (Queued)';
          allocated[idx].isUnmet = false;
          allocated[idx].waitTime = Math.floor(Math.random() * 60 + 60); // 60-120 min
        } else {
          allocated[idx].isUnmet = true;
          allocated[idx].resourceAssigned = null;
          allocated[idx].waitTime = Math.floor(Math.random() * 90 + 90); // 90-180 min if unmet
        }
        break;
      }
    }
  }

  // Clamp resource counts
  const resourceUtilization: ResourceUtilization = {
    doctorsUsed: Math.min(doctorsUsed, config.doctors),
    doctorsAvailable: config.doctors,
    icuUsed: Math.min(icuUsed, config.icuBeds),
    icuAvailable: config.icuBeds,
    ventilatorsUsed: Math.min(ventilatorsUsed, config.ventilators),
    ventilatorsAvailable: config.ventilators,
  };

  return {
    patients: allocated,
    resourceUtilization,
    exhaustionEvents,
  };
}
