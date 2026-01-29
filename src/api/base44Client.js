// Mock Base44 client to remove dependency on backend endpoint
const mockHandler = {
  get: (target, prop) => {
    if (prop === 'then') return undefined;
    if (typeof target[prop] === 'undefined') {
      target[prop] = new Proxy(() => Promise.resolve({ data: { ok: true, results: [] }, ok: true }), mockHandler);
    }
    return target[prop];
  }
};

export const base44 = new Proxy({
  auth: {
    me: async () => ({
      id: "mock-user-id",
      email: "mock@kingedwardvii.co.uk",
      full_name: "Mock User",
      role: "admin",
      access_level: "admin",
      settings: {
        theme: "light",
        ui: { shiftchip_color: "#0b5ed7" }
      }
    }),
    logout: () => {
      console.log("Mock logout");
      window.location.reload();
    },
    redirectToLogin: () => {
      console.log("Mock redirect to login");
    }
  },
  entities: {
    list: async (name) => {
      console.log(`Mock list entities: ${name}`);
      return [];
    },
    get: async (name, id) => {
      console.log(`Mock get entity: ${name} (${id})`);
      return null;
    },
    filter: async (name, params) => {
      console.log(`Mock filter entities: ${name}`, params);
      return [];
    },
    create: async (name, data) => {
      console.log(`Mock create entity: ${name}`, data);
      return { id: Math.random().toString(36).substr(2, 9), ...data };
    },
    update: async (name, id, data) => {
      console.log(`Mock update entity: ${name} (${id})`, data);
      return { id, ...data };
    },
    delete: async (name, id) => {
      console.log(`Mock delete entity: ${name} (${id})`);
      return { success: true };
    }
  },
  integrations: new Proxy({}, mockHandler),
  functions: {
    invoke: async (name, args) => {
      console.log(`Mock invoke function: ${name}`, args);
      // Return a standard response structure that components expect
      return { 
        data: { 
          ok: true, 
          message: "Mock response", 
          results: [],
          status: "success"
        },
        ok: true 
      };
    },
    smsHealth: async () => ({ data: { ok: true } }),
    sendSms: async () => ({ data: { id: "mock-id", status: "sent" } }),
    sendAcsEmail: async () => ({ data: { id: "mock-id", status: "sent" } })
  },
  appLogs: {
    logUserInApp: async (page) => {
      console.log(`Mock log user in app: ${page}`);
      return { success: true };
    }
  }
}, mockHandler);
