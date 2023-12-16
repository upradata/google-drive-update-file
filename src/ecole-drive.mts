import fs from 'node:fs/promises';
import { createReadStream as createFsReadStream } from 'node:fs';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google, Auth, drive_v3 } from 'googleapis';

// type FileMetadata = {
//     name?: string,
//     mimeType?: string,
//     parents?: string[];
//     // etc
// };

// declare module 'googleapis' {
//     namespace drive_v3 {
//         export interface Params$Resource$Files$Create {
//             resource?: FileMetadata;
//         }

//         export interface Params$Resource$Files$Update {
//             resource?: FileMetadata;
//         }
//     }
// }


// If modifying these scopes, delete token.json.
const SCOPES = [
    // 'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/drive.scripts',
];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 */
const loadSavedCredentialsIfExist = async (): Promise<Auth.OAuth2Client | null> => {
    try {
        const content = await fs.readFile(TOKEN_PATH, 'utf-8');
        if (!content)
            return null;

        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials) as Auth.OAuth2Client;
    } catch (err) {
        return null;
    }
};

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 */
const saveCredentials = async (client: Auth.OAuth2Client): Promise<void> => {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');

    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;

    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
};

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist();

    if (client)
        return client;

    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });

    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}


// test if it is working
// authorize().then(listFiles).catch(console.error);

const createEcoleDriveManager = (authClient: Auth.OAuth2Client) => {
    // Acquire an auth client, and bind it to all future calls
    //  google.options({ auth: authClient });
    const drive = google.drive({ version: 'v3', auth: authClient });

    const ecoleFolderId = '1L2gGi_UpwT9_gDJpLyLq0prY3cAcLThO';
    const inEcoleQuery = `"${ecoleFolderId}" in parents`;

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
            });

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
            });

            return res.data.files?.[ 0 ];
        } catch (e) {
            if (e.code === 404)
                return;

            throw e;
        }
    };

    /**
     * Upload a file to the specified folder
     */
    const updateFile = async (fileName: string, fileId: string): Promise<Pick<drive_v3.Schema$File, 'id'>> => {
        const file = await drive.files.update({
            fileId,
            media: {
                body: createFsReadStream(fileName),
                // auto
                // mimeType: 'application/vnd.google-apps.file'
                // https://developers.google.com/drive/api/guides/mime-types
            },
        });

        return file.data;
    };



    const createFile = async (filePath: string): Promise<Pick<drive_v3.Schema$File, 'id'>> => {

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
        });

        if (!file.id)
            throw new Error(`Could not create file "${filePath}"`);

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
        });

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

        const file = await searchFile(fileName);

        if (file?.id) {
            await updateFile(fileName, file.id);
            return file.id;
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


const authClient = await authorize();

const ecoleDrive = createEcoleDriveManager(authClient);


console.log(await ecoleDrive.uploadFile('./test.txt'));
