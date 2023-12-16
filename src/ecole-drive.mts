import path, { basename } from 'path';
import { authenticate } from '@google-cloud/local-auth';
import { google, Auth } from 'googleapis';
import { CachedFile, Token, createMetadataManager } from './metadata.mjs';
import { findPackageJsonDirectory } from './util.mjs';
import { fileURLToPath } from 'node:url';
import { createEcoleDriveManager } from './ecole-drive-manager.mjs';


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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const packageJsonDir = await findPackageJsonDirectory(__dirname);

const metadataManager = createMetadataManager({
    token: path.join(packageJsonDir, 'metadata/token.json'),
    credentials: path.join(packageJsonDir, 'metadata/credentials.json'),
    cachedFiles: path.join(packageJsonDir, 'metadata/files.json')
});

const metadata = await metadataManager.load();



// Reads previously authorized credentials from the save file.
const loadSavedCredentialsIfExist = async (): Promise<Auth.OAuth2Client | null> => {
    try {
        return google.auth.fromJSON((metadata.credentials.installed || metadata.credentials.web)!) as Auth.OAuth2Client;
    } catch (err) {
        return null;
    }
};

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 */
const saveCredentials = async (client: Auth.OAuth2Client): Promise<void> => {
    const credential = (metadata.credentials.installed || metadata.credentials.web)!;

    const token: Token = {
        type: 'authorized_user',
        client_id: credential.client_id,
        client_secret: credential.client_secret,
        refresh_token: client.credentials.refresh_token,
    };

    await metadataManager.save('token', token);
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
        keyfilePath: metadataManager.metadataFiles.credentials,
    });

    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;
}


// test if it is working
// authorize().then(listFiles).catch(console.error);


const authClient = await authorize();

const ecoleDrive = createEcoleDriveManager(authClient, metadata);

const uploadFileInEcole = async (filePath: string) => {
    const fileId = await ecoleDrive.uploadFile(filePath);

    if (fileId) {
        const cachedFile: CachedFile = {
            googleDriveFileId: fileId,
            localPath: filePath,
            name: basename(filePath)
        };

        metadata.cachedFiles = [ ...metadata.cachedFiles, cachedFile ];
        await metadataManager.save('cachedFiles', metadata.cachedFiles);
    }
};

console.log(await uploadFileInEcole('./test.txt'));
