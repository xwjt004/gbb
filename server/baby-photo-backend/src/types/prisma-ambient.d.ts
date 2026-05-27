// Ambient module to assist TS in resolving the in-package re-export path used by @prisma/client
// Mitigates TS2307 when index.d.ts does `export * from '.prisma/client/default'` under pnpm layout.
declare module '.prisma/client/default' {
  export * from '.prisma/client';
}
