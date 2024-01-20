import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createEcoleDriveManager } from './ecole-drive-manager.mjs';
import { createMetadataManager } from './metadata.mjs';
import { displayNotification } from './notifier.mjs';
import { findPackageJsonDirectory } from './util.mjs';
import { logIn } from './login.mjs';


const loadMetadata = async (metadataDir: string) => {
    // The file token.json stores the user's access and refresh tokens, and is
    // created automatically when the authorization flow completes for the first
    // time.

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const packageJsonDir = await findPackageJsonDirectory(__dirname);

    const metadataManager = createMetadataManager({
        credentials: path.join(packageJsonDir, 'metadata/credentials.json'),
        token: path.join(metadataDir, 'token.json'),
        cachedFiles: path.join(metadataDir, 'files.json')
    });

    await metadataManager.load();

    return metadataManager;
};

export const createEcoleDrive = async (options: { metadataDir?: string; enableNotification?: boolean; } = {}) => {

    const { metadataDir = path.join(process.cwd(), 'metadata'), enableNotification = false } = options;

    const metadataManager = await loadMetadata(metadataDir);
    const metadata = metadataManager.getMetadata();

    const ecoleDrive = await createEcoleDriveManager(logIn(metadataManager), metadata);

    type UploadFileReturn = { filePath: string; } & ({ fileId: string; type: 'success'; } | { message: string; type: 'failed'; });

    const uploadFile = async (filePath: string): Promise<UploadFileReturn> => {
        try {

            // if (enableNotification)
            //    await displayNotification({ message: path.basename(filePath), subtitle: 'start' });

            const fileId = await ecoleDrive.uploadFile(filePath);

            // if (enableNotification)
            //    await displayNotification({ message: path.basename(filePath), subtitle: 'end' });

            const filename = path.basename(filePath);

            if (fileId) {
                if (!metadata.cachedFiles.find(f => f.googleDriveFileId === fileId)) {
                    const cachedFile = metadata.cachedFiles.find(f => f.name === filename);

                    if (cachedFile)
                        cachedFile.googleDriveFileId = fileId;
                    else {
                        metadata.cachedFiles = [ ...metadata.cachedFiles, {
                            googleDriveFileId: fileId,
                            localPath: filePath,
                            name: filename
                        } ];
                    }

                    await metadataManager.save('cachedFiles', metadata.cachedFiles);
                }

                return { filePath, fileId, type: 'success' };
            }

            return { type: 'failed', filePath, message: `Failed during ecoleDrive.uploadFile` };

        } catch (e) {
            console.error(e);
            return { type: 'failed', filePath, message: typeof e === 'string' ? e : e.message || JSON.stringify(e) };

        }
    };

    const uploadFiles = async (...files: string[]): Promise<UploadFileReturn[]> => {
        return await Promise.all(files.map(uploadFile));

        // serial
        // return files.reduce(async (results$, file) => {
        //     const results = await results$;
        //     return [ ...results, await uploadFile(file) ];
        // }, Promise.resolve([]));
    };


    return {
        uploadFile,
        uploadFiles
    };
};

// console.log(await uploadFileInEcole('./test.txt'));
