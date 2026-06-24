// Mock in-memory database for development when PostgreSQL is not available
import * as schema from "./schema";

export interface MockDatabase {
  users: any[];
  sessions: any[];
  resumes: any[];
  interviews: any[];
  questions: any[];
  select: (table: string) => any;
  insert: (table: string) => any;
  update: (table: string) => any;
  delete: (table: string) => any;
}

const mockData = {
  users: [] as any[],
  sessions: [] as any[],
  resumes: [] as any[],
  interviews: [] as any[],
  questions: [] as any[],
};

export const createMockDb = (): any => {
  return {
    select: () => ({
      from: (table: any) => ({
        where: (condition: any) => {
          const tableName = table._.name;
          const data = mockData[tableName as keyof typeof mockData] || [];
          return Promise.resolve(data);
        },
      }),
      all: () => Promise.resolve(mockData),
    }),
    insert: (table: any) => ({
      values: (values: any) => ({
        returning: () => {
          const tableName = table._.name;
          const id = Math.random().toString(36).substring(7);
          const newEntry = { id, ...values, createdAt: new Date() };
          if (!mockData[tableName as keyof typeof mockData]) {
            mockData[tableName as keyof typeof mockData] = [];
          }
          mockData[tableName as keyof typeof mockData].push(newEntry);
          return Promise.resolve([newEntry]);
        },
      }),
    }),
    update: (table: any) => ({
      set: (values: any) => ({
        where: (condition: any) => Promise.resolve([]),
      }),
    }),
    delete: (table: any) => ({
      where: (condition: any) => Promise.resolve([]),
    }),
  };
};
