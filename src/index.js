import { utils } from 'umi';
import { basename, dirname, extname, join, relative } from 'path';
import { readFileSync } from 'fs';
import { getModels } from './getModels';
import { getUserLibDir } from './getUserLibDir';

const { Mustache, lodash, winPath } = utils;

export default (api) => {
  const { logger } = api;

  function getModelDir() {
    return api.config.singular ? 'model' : 'models';
  }

  function getSrcModelsPath() {
    return join(api.paths.absSrcPath || '', getModelDir());
  }

  function getAllModels() {
    const srcModelsPath = getSrcModelsPath();
    const baseOpts = {};
    return lodash.uniq([
      ...getModels({
        base: srcModelsPath,
        ...baseOpts,
      }),
      ...getModels({
        base: api.paths.absPagesPath || '',
        pattern: `**/${getModelDir()}/**/*.{ts,tsx,js,jsx}`,
        ...baseOpts,
      }),
      ...getModels({
        base: api.paths.absPagesPath || '',
        pattern: `**/model.{ts,tsx,js,jsx}`,
        ...baseOpts,
      }),
    ]);
  }

  let hasModels = false;

  // 初始检测一遍
  api.onStart(() => {
    hasModels = getAllModels().length > 0;
  });

  // 生成临时文件
  api.onGenerateFiles({
    fn() {
      const models = getAllModels();
      hasModels = models.length > 0;

      logger.debug('zoro models:');
      logger.debug(models);

      // 没有 models 不生成文件
      if (!hasModels) return;

      // zoro.js
      const zoroTpl = readFileSync(join(__dirname, '../template/zoro.tpl'), 'utf-8');
      api.writeTmpFile({
        path: 'plugin-zoro/zoro.ts',
        content: Mustache.render(zoroTpl, {
          RegisterModels: models
            .map(path => {
              // prettier-ignore
              return `
app.model({ ...(require('${path}').default) });
          `.trim();
            })
            .join('\r\n'),
        }),
      });

      // runtime.js
      const runtimeTpl = readFileSync(join(__dirname, '../template/runtime.tpl'), 'utf-8');
      api.writeTmpFile({
        path: 'plugin-zoro/runtime.ts',
        content: Mustache.render(runtimeTpl, {}),
      });

      // exports.ts
      const exportsTpl = readFileSync(join(__dirname, '../template/exports.tpl'), 'utf-8');

      api.writeTmpFile({
        path: 'plugin-zoro/exports.ts',
        content: Mustache.render(exportsTpl, {}),
      });
    },
    // 要比 preset-built-in 靠前
    // 在内部文件生成之前执行，这样 hasModels 设的值对其他函数才有效
    stage: -1,
  });

  // src/models 下的文件变化会触发临时文件生成
  api.addTmpGenerateWatcherPaths(() => [getSrcModelsPath()]);

  // zoro 优先读用户项目的依赖
  api.addProjectFirstLibraries(() => [
    { name: '@opcjs/zoro', path: dirname(require.resolve('@opcjs/zoro/package.json')) },
    { name: '@opcjs/zoro-plugin', path: dirname(require.resolve('@opcjs/zoro-plugin/package.json')) },
    { name: 'react-redux', path: dirname(require.resolve('react-redux/package.json')) },
  ]);

  // Runtime Plugin
  api.addRuntimePlugin(() =>
    hasModels ? [join(api.paths.absTmpPath || '', 'plugin-zoro/runtime.ts')] : [],
  );
  api.addRuntimePluginKey(() => (hasModels ? ['zoro'] : []));

  // 导出内容
  api.addUmiExports(() =>
    hasModels
      ? [
          {
            exportAll: true,
            source: '../plugin-zoro/exports',
          },
        ]
      : [],
  );
};