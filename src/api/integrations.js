import { base44 } from './base44Client';

const createIntegrationProxy = (name) => new Proxy({}, {
  get: (target, prop) => {
    return (...args) => {
      console.log(`Mock integration call: ${name}.${prop}`, args);
      return Promise.resolve({ ok: true, data: { status: "success", results: [] } });
    };
  }
});

export const integrations = new Proxy({}, {
  get: (target, name) => createIntegrationProxy(name)
});

export const Core = createIntegrationProxy('Core');
export const SendEmail = createIntegrationProxy('SendEmail');
export const SendSMS = createIntegrationProxy('SendSMS');
export const UploadFile = createIntegrationProxy('UploadFile');
export const ExtractDataFromUploadedFile = createIntegrationProxy('ExtractDataFromUploadedFile');
export const AzureCommunicationServices = createIntegrationProxy('AzureCommunicationServices');

export const InvokeLLM = Core.InvokeLLM;
export const GenerateImage = Core.GenerateImage;
