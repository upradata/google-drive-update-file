import { authenticate } from '@google-cloud/local-auth';
import { google, Auth } from 'googleapis';
import { MetadataManager, Token } from './metadata.mjs';


export const logIn = (metadataManager: MetadataManager) => {
    // If modifying these scopes, delete token.json.
    const SCOPES = [
        // 'https://www.googleapis.com/auth/drive.metadata.readonly',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.appdata',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata',
        'https://www.googleapis.com/auth/drive.scripts',
    ];

    const metadata = metadataManager.getMetadata();

    // Reads previously authorized credentials from the save file.
    const loadSavedCredentialsIfExist = async (): Promise<Auth.OAuth2Client | null> => {
        try {
            if (metadata.token)
                return google.auth.fromJSON(metadata.token) as Auth.OAuth2Client;

            return null;
        } catch (err) {
            return null;
        }
    };


    // Serializes credentials to a file comptible with GoogleAUth.fromJSON.
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


    // Load or request or authorization to call APIs.
    async function authorize(options: { useSavedToken?: boolean; } = {}) {
        const { useSavedToken = true } = options;

        if (useSavedToken) {
            const client = await loadSavedCredentialsIfExist();

            if (client)
                return client;
        }

        const client = await authenticate({
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

    // const authClient = await authorize();
    // return authClient;

    return {
        loadSavedCredentialsIfExist,
        saveCredentials,
        authorize
    };
};

export type LogIn = ReturnType<typeof logIn>;