/** @type {import('esbuild').BuildOptions} */
export const config = {
    define: { IS_DEV: 'true', IS_PROD: 'false', IS_WEB: 'false' },
    charset: 'utf8',
    entryPoints: [ 'src/ecole-drive.mts' ],
    outdir: 'build-cjs-full',
    bundle: true,
    // packages: 'external',
    sourcemap: true,
    platform: 'node',
    format: 'cjs',
    outExtension: { '.js': '.js' },
    color: true,
    target: [ 'esnext' ]
};
