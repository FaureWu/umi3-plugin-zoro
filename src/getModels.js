import { utils } from 'umi';
import { join } from 'path';

export function getModels(opts) {
  return utils.lodash
    .uniq(
      utils.glob
        .sync(opts.pattern || '**/*.{ts,tsx,js,jsx}', {
          cwd: opts.base,
        })
        .map(f => join(opts.base, f))
        .concat(opts.extraModels || [])
        .map(utils.winPath),
    )
    .filter(f => {
      if (/\.d.ts$/.test(f)) return false;
      if (/\.(test|e2e|spec).(j|t)sx?$/.test(f)) return false;

      return true
    });
}