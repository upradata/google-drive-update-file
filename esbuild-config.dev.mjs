/** @type {import('esbuild').BuildOptions} */
export const config = {
    define: { IS_DEV: 'true', IS_PROD: 'false', IS_WEB: 'false' },
    charset: 'utf8',
    entryPoints: [ 'src/ecole-drive.mts' ],
    outdir: 'build-test',
    bundle: true,
    packages: 'external',
    sourcemap: true,
    platform: 'node',
    format: 'esm',
    outExtension: { '.js': '.mjs' },
    color: true,
    target: [ 'esnext' ]
};
