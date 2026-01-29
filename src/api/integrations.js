import { base44 } from './base44Client';

export const Core = {
  InvokeLLM: async (args) => base44.functions.invoke('InvokeLLM', args),
  SendEmail: async (args) => base44.functions.invoke('SendEmail', args),
  SendSMS: async (args) => base44.functions.invoke('SendSMS', args),
  UploadFile: async (args) => base44.functions.invoke('UploadFile', args),
  GenerateImage: async (args) => base44.functions.invoke('GenerateImage', args),
  ExtractDataFromUploadedFile: async (args) => base44.functions.invoke('ExtractDataFromUploadedFile', args),
};

export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const SendSMS = Core.SendSMS;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;






