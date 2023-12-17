import fs from 'fs-extra';


export type Token = {
    type: string;
    client_id: string;
    client_secret: string;
    refresh_token?: string | null | undefined;
};

export type Credential = {
    client_id: string;
    project_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_secret: string;
    redirect_uris: string[];
};

export type Credentials = {
    installed?: Credential;
    web?: Credential;
};

export type CachedFile = {
    name: string;
    localPath: string;
    googleDriveFileId: string;
};

export type CachedFiles = CachedFile[];


export type Metadata<T = Token, C = Credentials, F = CachedFiles> = {
    token: T;
    credentials: C;
    cachedFiles: F;
};

const metadataInit: Partial<Metadata> = {
    cachedFiles: []
};

export const createMetadataManager = (metadataFiles: Metadata<string, string, string>) => {

    let metadata: Metadata;

    const load = async (): Promise<Metadata> => {

        const datas = await Promise.all(Object.entries(metadataFiles).map(async ([ name, filePath ]) => {
            await fs.ensureFile(filePath);

            const data = await fs.readFile(filePath, 'utf-8');

            if (!data)
                return [ name, metadataInit[ name ] ];

            return [ name, JSON.parse(data) ];
        }));

        metadata = Object.fromEntries(datas);
        return metadata;
    };


    const save = async <N extends keyof Metadata>(metadataName: N, data: Metadata[ N ]) => {
        return fs.writeFile(metadataFiles[ metadataName ], JSON.stringify(data), 'utf-8');
    };

    return {
        load,
        save,
        metadataFiles,
        getMetadata: () => metadata
    };
};


export type MetadataManager = ReturnType<typeof createMetadataManager>;