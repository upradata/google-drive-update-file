import fs from 'node:fs/promises';
import path from 'path';
import process from 'process';
import { authenticate } from '@google-cloud/local-auth';
import { google,Auth } from 'googleapis';
// import { GoogleAuth } from 'google-auth-library';


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
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist(): Promise<Auth.OAuth2Client | null> {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        if (!content)
            return null;

        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        return null;
    }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
        return client;
    }
    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
        await saveCredentials(client);
    }
    return client;

    // with another lib
    /* const auth = new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/drive',
    }); */

}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {OAuth2Client} authClient An authorized OAuth2 client.
 */
async function listFiles(authClient) {
    const drive = google.drive({ version: 'v3', auth: authClient });

    const res = await drive.files.list({
        pageSize: 10,
        fields: 'nextPageToken, files(id, name)',
    });
    const files = res.data.files;
    if (files.length === 0) {
        console.log('No files found.');
        return;
    }

    console.log('Files:');
    files.map((file) => {
        console.log(`${file.name} (${file.id})`);
    });
}

// test if it is working
// authorize().then(listFiles).catch(console.error);

authorize().then(authClient => {
    // Acquire an auth client, and bind it to all future calls
    //  google.options({ auth: authClient });
    const drive = google.drive({ version: 'v3', auth: authClient });
    const ecoleFolderId = '1L2gGi_UpwT9_gDJpLyLq0prY3cAcLThO';

    /**
     * Lists the names and IDs of up to 10 files.
     * @param {OAuth2Client} authClient An authorized OAuth2 client.
     */
    const listFiles = async () => {
        const res = await drive.files.list({

            pageSize: 10,
            fields: 'nextPageToken, files(id, name)',
        });

        const files = res.data.files;
        if (files.length === 0) {
            console.log('No files found.');
            return;
        }

        console.log('Files:');
        files.map((file) => {
            console.log(`${file.name} (${file.id})`);
        });
    };


    /**
     * Upload a file to the specified folder
     * @param{string} folderId folder ID
     * @return{obj} file Id
     **/
    async function uploadToFolder(folderId) {

        const fileMetadata = {
            name: 'photo.jpg',
            parents: [ ecoleFolderId ],
        };
        const media = {
            mimeType: 'image/jpeg',
            body: fs.createReadStream('files/photo.jpg'),
        };

        try {
            const file = await drive.files.create({

                resource: fileMetadata,
                media: media,
                fields: 'id',
            });
            console.log('File Id:', file.data.id);
            return file.data.id;
        } catch (err) {
            // TODO(developer) - Handle error
            throw err;
        }
    }

    const updateFile = async (filepath) => {
        drive.files.get();

        // First create a new File.
        const file = new File();

        // File's new metadata.
        // file.setTitle(newTitle);
        // file.setDescription(newDescription);
        // file.setMimeType(newMimeType);

        // File's new content.
        const fileContent = new java.io.File(newFilename);
        // FileContent mediaContent = new FileContent(newMimeType, fileContent);

        const res = await drive.files.update(

        );
    };
});
