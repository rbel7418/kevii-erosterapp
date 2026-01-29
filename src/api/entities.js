import { base44 } from './base44Client';

const createEntityProxy = (name) => new Proxy({}, {
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
    // Handle potential function calls on the entity itself
    return () => Promise.resolve({ ok: true, data: [] });
  }
});

// Dynamic export handler for all entities
export const all = new Proxy({}, {
  get: (target, name) => createEntityProxy(name)
});

// Specific exports for commonly used entities to satisfy named imports
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
