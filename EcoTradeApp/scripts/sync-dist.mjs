import { cp, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const appDir = path.resolve('..', 'Sesión de Reciclaje EcoTrade');
const srcDist = path.join(appDir, 'dist');
const dstDist = path.resolve('dist');

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(srcDist))) {
  throw new Error(`No existe dist en: ${srcDist}. ¿Falló el build de la app?`);
}

await rm(dstDist, { recursive: true, force: true });
await cp(srcDist, dstDist, { recursive: true });

console.log(`[wrapper] dist sincronizado: ${srcDist} -> ${dstDist}`);
