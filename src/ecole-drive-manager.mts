
import { createReadStream as createFsReadStream } from 'node:fs';
import path from 'node:path';
import { google, drive_v3, Common } from 'googleapis';
import { Metadata } from './metadata.mjs';
import { displayNotification } from './notifier.mjs';
import { LogIn } from './login.mjs';

// Auth.OAuth2Client
export const createEcoleDriveManager = async (login: LogIn, metadata: Pick<Metadata, 'cachedFiles'>) => {
    // Acquire an auth client, and bind it to all future calls
    //  google.options({ auth: authClient });

    const getDrive = async () => {
        try {
            const authClient = await login.authorize({ useSavedToken: true });
            return google.drive({ version: 'v3', auth: authClient });
        } catch {
            const authClient = await login.authorize({ useSavedToken: false });
            return google.drive({ version: 'v3', auth: authClient });
        }
    };

    const drive = await getDrive();

    const ecoleFolderId = '1L2gGi_UpwT9_gDJpLyLq0prY3cAcLThO';
    const inEcoleQuery = `"${ecoleFolderId}" in parents`;

    const gaxiosOptions: Common.GaxiosOptions = {
        timeout: 120 * 1000
    };
    // const ecoleFolder = await drive.files.get({ fileId: ecoleFolderId });

    /**
     * Lists the names and IDs of up to 10 files.
     */
    const getFiles = async (pageSize: number = 100): Promise<Pick<drive_v3.Schema$File, 'id' | 'name'>[]> => {

        const getFiles = async (files: drive_v3.Schema$File[] = []) => {

            const res = await drive.files.list({
                q: inEcoleQuery, // filter out the Ecole folder
                pageSize,
                fields: 'nextPageToken, files(id, name)',
            }, gaxiosOptions);

            const { files: newFiles = [], nextPageToken } = res.data;

            const allFiles = [ ...files, ...newFiles ];

            if (!nextPageToken)
                return allFiles;

            return getFiles(allFiles);
        };

        return getFiles();
    };


    const searchFile = async (fileName: string): Promise<Pick<drive_v3.Schema$File, 'id' | 'name'> | undefined> => {
        try {
            const res = await drive.files.list({
                q: `${inEcoleQuery} and name = "${fileName}"`, // filter out the Ecole folder
                fields: 'nextPageToken, files(id, name)',
            }, gaxiosOptions);

            return res.data.files?.[ 0 ];
        } catch (e) {
            if (e.code === 404)
                return;

            throw e;
        }
    };


    // Upload a file to the specified folder
    const updateFile = async (filePath: string, fileId: string): Promise<Pick<drive_v3.Schema$File, 'id'>> => {
        // await displayNotification({ message: path.basename(filePath), subtitle: 'updateFile' });

        const file = await drive.files.update({
            fileId,
            media: {
                body: createFsReadStream(filePath),
                // auto
                // mimeType: 'application/vnd.google-apps.file'
                // https://developers.google.com/drive/api/guides/mime-types
            },
        }, gaxiosOptions);

        // await displayNotification({ message: path.basename(filePath), subtitle: 'updateFile done' });

        return file.data;
    };



    const createFile = async (filePath: string): Promise<Pick<drive_v3.Schema$File, 'id'>> => {
        // await displayNotification({ message: path.basename(filePath), subtitle: 'createFile' });

        const { data: file } = await drive.files.create({
            // includePermissionsForView: '',
            requestBody: {
                name: path.basename(filePath),
                parents: [ ecoleFolderId ]
            },
            media: {
                body: createFsReadStream(filePath),
                // mimeType: 'image/jpeg'
            },
            fields: 'id'
        }, gaxiosOptions);

        if (!file.id)
            throw new Error(`Could not create file "${filePath}"`);

        // await displayNotification({ message: path.basename(filePath), subtitle: 'createFile done' });

        return file;
    };

    const createSharePermission = async (fileId: string): Promise<Pick<drive_v3.Schema$Permission, 'id'>> => {

        const permission = await drive.permissions.create({
            fileId,
            requestBody: {
                type: 'anyone',
                role: 'reader'
            },
            fields: 'id'
        }, gaxiosOptions);

        if (!permission.data.id) {
            throw new Error(`Could not create a shared permission for file "${fileId}"`);
        }

        return permission.data;
    };

    const createFileWithSharedPermission = async (filePath: string) => {
        const file = await createFile(filePath);
        const permission = await createSharePermission(file.id!);

        return { file, permission };
    };

    const createSharePermissionForAllFiles = async (): Promise<Pick<drive_v3.Schema$Permission, 'id'>[]> => {
        const files = await getFiles();

        const permissions = await Promise.all(files.map(file => createSharePermission(file.id!)));
        return permissions;
    };

    const uploadFile = async (filePath: string) => {
        const fileName = path.basename(filePath);

        const getFileId = async () => {
            const cachedFile = metadata.cachedFiles.filter(f => {
                return f.localPath === filePath || f.name === path.basename(filePath);
            });

            if (cachedFile.length === 1)
                return cachedFile[ 0 ].googleDriveFileId;

            return (await searchFile(fileName))?.id;
        };

        const fileId = await getFileId();

        // await displayNotification({ message: fileName + ' ' + fileId, subtitle: 'found' });

        if (fileId) {
            await updateFile(filePath, fileId);
            return fileId;
        }

        const newFile = await createFileWithSharedPermission(filePath);
        return newFile.file.id;
    };

    return {
        createFile,
        updateFile,
        searchFile,
        getFiles,
        uploadFile,
        createSharePermission,
        createFileWithSharedPermission,
        createSharePermissionForAllFiles,
    };
};
