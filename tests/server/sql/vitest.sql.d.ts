/**
 * Vitest `inject()` keys provided by `globalSetup.ts` for the server-sql project.
 */
declare module 'vitest' {
  export interface ProvidedContext {
    sqlDatabaseUrl?: string;
    sqlTestsSkipped?: string;
    sqlTestsSkipReason?: string;
  }
}

export {};
