import { base44 } from './base44Client';
export const enqueueShiftCreate = async (shift) => {
  console.log('Queuing shift create:', shift);
  return base44.entities.create('Shift', shift);
};
export const enqueueShiftDelete = async (shiftId) => {
  console.log('Queuing shift delete:', shiftId);
  return base44.entities.delete('Shift', shiftId);
};
export const enqueueEmployeeDelete = async (empId) => {
  console.log('Queuing employee delete:', empId);
  return base44.entities.delete('Employee', empId);
};
