// Production entry point for hosts that launch a plain JS file (e.g. Hostinger
// "Entry file"). It registers the tsx ESM loader so the TypeScript server
// (server.ts) runs without a separate compile step, then boots the app.
import { register } from 'tsx/esm/api';

register();

await import('./server.ts');
