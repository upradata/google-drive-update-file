#!/usr/bin/env node

import commandLineArgs from 'command-line-args';
import path from 'node:path';
import { createEcoleDrive } from './ecole-drive.mjs';
import { displayNotification } from './notifier.mjs';

try {
    type Options = {
        file: string[];
        metadataDir?: string;
        logOutputVerbose?: boolean;
        logOutputOnlySuccessFiles?: boolean;
        logOutputFilenames?: boolean;
        enableNotification?: boolean;
    };

    const options = commandLineArgs([
        { name: 'file', alias: 'f', type: String, multiple: true, defaultOption: true },
        { name: 'metadataDir', alias: 'm', type: String },
        { name: 'logOutputVerbose', type: Boolean },
        { name: 'logOutputOnlySuccessFiles', type: Boolean },
        { name: 'logOutputFilenames', type: Boolean },
        { name: 'enableNotification', type: Boolean }

    ]);

    const opts: Options = { logOutputVerbose: true, ...(options as Options) };

    const { uploadFiles } = await createEcoleDrive(opts);

    const results = await uploadFiles(...opts.file);

    const success = results.every(r => r.type === 'success');
    const exitCode = success ? 0 : 1;

    const displayFile = (filePath: string) => opts.logOutputFilenames ? path.basename(filePath) : filePath;

    if (opts.logOutputVerbose || opts.logOutputOnlySuccessFiles) {

        const result = await Promise.allSettled(results.map(async r => {
            const file = displayFile(r.filePath);

            const display = async (type: 'success' | 'failed') => {
                if (opts.enableNotification)
                    await displayNotification({ message: path.basename(file), subtitle: type });

                if (opts.logOutputOnlySuccessFiles && type === 'success') {
                    console.log(file);
                    return;
                }

                if (opts.logOutputVerbose)
                    console.log(`‣ ${type}: ${file}`);
            };

            await display(r.type);
        }));

        const rejects = result.filter(r => r.status === 'rejected').reduce((s, r) => `${s} ${(r as PromiseRejectedResult).reason}`, '');

        if (rejects) {
            console.log(`Error: ${rejects}`);
        }

        process.exit(exitCode);
    }

    process.exit(exitCode);

} catch (e) {
    console.log(`Error: ${e.message ?? e.toString?.() ?? JSON.stringify(e, null, 2)}`);
    process.exit(1);
}
