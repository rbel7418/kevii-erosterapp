import { Workspace as WorkspaceEntity } from "@/entities/Workspace";
import { Space as SpaceEntity } from "@/entities/Space";
import { Task as TaskEntity } from "@/entities/Task";
import { Settings as SettingsEntity } from "@/entities/Settings";
import { Admission as AdmissionEntity } from "@/entities/Admission";

export const Workspace = WorkspaceEntity;
export const Space = SpaceEntity;
export const Task = TaskEntity;
export const Admission = AdmissionEntity;

export const Settings = {
  get: async () => {
    const list = await SettingsEntity.list();
    return list && list.length > 0 ? list[0] : null;
  },
  update: async (data) => {
    const list = await SettingsEntity.list();
    if (list && list.length > 0) {
      return await SettingsEntity.update(list[0].id, data);
    } else {
      return await SettingsEntity.create(data);
    }
  }
};