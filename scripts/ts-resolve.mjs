/** Lets Node import the app's TypeScript sources (extensionless relative imports → .ts/.tsx). Used by build scripts. */
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function resolve(spec, ctx, next) {
  if ((spec.startsWith('./') || spec.startsWith('../')) && !/\\.[a-z]+$/.test(spec) && ctx.parentURL) {
    for (const ext of ['.ts', '.tsx']) {
      const url = new URL(spec + ext, ctx.parentURL);
      if (existsSync(fileURLToPath(url))) return next(url.href, ctx);
    }
  }
  return next(spec, ctx);
}`),
);
