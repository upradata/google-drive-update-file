import * as esbuild from 'esbuild';
import hasFlag from 'has-flag';

const isProd = hasFlag('prod');

console.log(`Running in "${isProd ? 'PRODUCTION' : 'DEV'}" mode`);


const getConfig = () => {
    if (isProd)
        return import('./esbuild-config.prod.mjs');

    return import('./esbuild-config.dev.mjs');
};


const { config } = await getConfig();

if (!hasFlag('watch') && !hasFlag('serve')) {
    await esbuild.build(config);
    console.log(`Build done!`);
    process.exit(0);
}

const context = await esbuild.context(config);

if (hasFlag('watch') || hasFlag('serve')) {
    // tells esbuild to watch the file system and automatically rebuild for you whenever you edit and save a file that could invalidate the build
    await context.watch();
    console.log('Files watch enabled.');
}

if (hasFlag('serve')) {
    // starts a local development server that serves the results of the latest build.
    // Incoming requests automatically start new builds so your web app is always up to date when you reload the page in the browser. 
    const { host, port } = await context.serve({ servedir: '.' });

    console.log(`Server running on (host=${host} and port=${port}).`);
}
