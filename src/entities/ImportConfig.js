export const ImportConfig = {
  async list() {
    console.log('Mock list entities: ImportConfig');
    return [];
  },
  async create(data) {
    console.log('Mock create ImportConfig:', data);
    return { id: 'mock-1', ...data };
  },
  async update(id, data) {
    console.log('Mock update ImportConfig:', id, data);
    return { id, ...data };
  }
};
