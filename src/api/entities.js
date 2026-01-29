import { base44 } from './base44Client';
import { SupabaseShiftCode, SupabaseEmployee, SupabaseShift } from './supabaseClient';

const SUPABASE_ENTITIES = {
  'ShiftCode': SupabaseShiftCode,
  'Employee': SupabaseEmployee,
  'Shift': SupabaseShift
};

const createEntityProxy = (name) => {
  const supabaseEntity = SUPABASE_ENTITIES[name];
  
  if (supabaseEntity) {
    return new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'list') return (params) => supabaseEntity.list();
        if (prop === 'get') return (id) => supabaseEntity.get(id);
        if (prop === 'filter') return (params) => supabaseEntity.filter(params);
        if (prop === 'create') return (data) => supabaseEntity.create(data);
        if (prop === 'update') return (id, data) => supabaseEntity.update(id, data);
        if (prop === 'delete') return (id) => supabaseEntity.delete(id);
        if (prop === 'upsert') return async (data) => {
          if (data.id) {
            return supabaseEntity.update(data.id, data);
          }
          return supabaseEntity.create(data);
        };
        return () => Promise.resolve({ ok: true, data: [] });
      }
    });
  }
  
  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'list') return (params) => base44.entities.list(name, params);
      if (prop === 'get') return (id) => base44.entities.get(name, id);
      if (prop === 'filter') return (params) => base44.entities.filter(name, params);
      if (prop === 'create') return (data) => base44.entities.create(name, data);
      if (prop === 'update') return (id, data) => base44.entities.update(name, id, data);
      if (prop === 'delete') return (id) => base44.entities.delete(name, id);
      if (prop === 'upsert') return (data) => {
        console.log(`Mock upsert entity: ${name}`, data);
        return Promise.resolve({ id: data.id || 'mock-id', ...data });
      };
      if (prop === 'updateMyUserData') return (data) => Promise.resolve({ id: 'mock-id', ...data });
      return () => Promise.resolve({ ok: true, data: [] });
    }
  });
};

export const all = new Proxy({}, {
  get: (target, name) => createEntityProxy(name)
});

export const User = createEntityProxy('User');
export const Employee = createEntityProxy('Employee');
export const Shift = createEntityProxy('Shift');
export const Department = createEntityProxy('Department');
export const Role = createEntityProxy('Role');
export const ShiftCode = createEntityProxy('ShiftCode');
export const AuditLog = createEntityProxy('AuditLog');
export const PTListAdmission = createEntityProxy('PTListAdmission');
export const ChatChannel = createEntityProxy('ChatChannel');
export const ChatMembership = createEntityProxy('ChatMembership');
export const ChatMessage = createEntityProxy('ChatMessage');
export const IPCTrainingRecord = createEntityProxy('IPCTrainingRecord');
export const VisualLibrary = createEntityProxy('VisualLibrary');
export const WikiEntry = createEntityProxy('WikiEntry');
export const OrgSettings = createEntityProxy('OrgSettings');
export const Announcement = createEntityProxy('Announcement');
export const AnnouncementInbox = createEntityProxy('AnnouncementInbox');
export const Request = createEntityProxy('Request');
export const Leave = createEntityProxy('Leave');
export const Presence = createEntityProxy('Presence');
export const WardCensus = createEntityProxy('WardCensus');
export const RotaStatus = createEntityProxy('RotaStatus');
export const RosterVersion = createEntityProxy('RosterVersion');
export const WorkforceConfig = createEntityProxy('WorkforceConfig');
export const WorkforceForecast = createEntityProxy('WorkforceForecast');
export const ShiftComment = createEntityProxy('ShiftComment');
export const ShiftSwapRequest = createEntityProxy('ShiftSwapRequest');
export const AdmissionEvent = createEntityProxy('AdmissionEvent');
export const AppPermission = createEntityProxy('AppPermission');
export const Query = createEntityProxy('Query');
