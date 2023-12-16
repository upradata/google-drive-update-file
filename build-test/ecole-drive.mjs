// src/ecole-drive.mts
import fs from "node:fs/promises";
import { createReadStream as createFsReadStream } from "node:fs";
import path from "path";
import process from "process";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
var SCOPES = [
  // 'https://www.googleapis.com/auth/drive.metadata.readonly',
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata",
  "https://www.googleapis.com/auth/drive.scripts"
];
var TOKEN_PATH = path.join(process.cwd(), "token.json");
var CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
var loadSavedCredentialsIfExist = async () => {
  try {
    const content = await fs.readFile(TOKEN_PATH, "utf-8");
    if (!content)
      return null;
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
};
var saveCredentials = async (client) => {
  const content = await fs.readFile(CREDENTIALS_PATH, "utf-8");
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token
  });
  await fs.writeFile(TOKEN_PATH, payload);
};
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client)
    return client;
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}
var createEcoleDriveManager = (authClient2) => {
  const drive = google.drive({ version: "v3", auth: authClient2 });
  const ecoleFolderId = "1L2gGi_UpwT9_gDJpLyLq0prY3cAcLThO";
  const inEcoleQuery = `"${ecoleFolderId}" in parents`;
  const getFiles = async (pageSize = 100) => {
    const getFiles2 = async (files = []) => {
      const res = await drive.files.list({
        q: inEcoleQuery,
        // filter out the Ecole folder
        pageSize,
        fields: "nextPageToken, files(id, name)"
      });
      const { files: newFiles = [], nextPageToken } = res.data;
      const allFiles = [...files, ...newFiles];
      if (!nextPageToken)
        return allFiles;
      return getFiles2(allFiles);
    };
    return getFiles2();
  };
  const searchFile = async (fileName) => {
    try {
      const res = await drive.files.list({
        q: `${inEcoleQuery} and name = "${fileName}"`,
        // filter out the Ecole folder
        fields: "nextPageToken, files(id, name)"
      });
      return res.data.files?.[0];
    } catch (e) {
      if (e.code === 404)
        return;
      throw e;
    }
  };
  const updateFile = async (fileName, fileId) => {
    const file = await drive.files.update({
      fileId,
      media: {
        body: createFsReadStream(fileName)
        // auto
        // mimeType: 'application/vnd.google-apps.file'
        // https://developers.google.com/drive/api/guides/mime-types
      }
    });
    return file.data;
  };
  const createFile = async (filePath) => {
    const { data: file } = await drive.files.create({
      // includePermissionsForView: '',
      requestBody: {
        name: path.basename(filePath),
        parents: [ecoleFolderId]
      },
      media: {
        body: createFsReadStream(filePath)
        // mimeType: 'image/jpeg'
      },
      fields: "id"
    });
    if (!file.id)
      throw new Error(`Could not create file "${filePath}"`);
    return file;
  };
  const createSharePermission = async (fileId) => {
    const permission = await drive.permissions.create({
      fileId,
      requestBody: {
        type: "anyone",
        role: "reader"
      },
      fields: "id"
    });
    if (!permission.data.id) {
      throw new Error(`Could not create a shared permission for file "${fileId}"`);
    }
    return permission.data;
  };
  const createFileWithSharedPermission = async (filePath) => {
    const file = await createFile(filePath);
    const permission = await createSharePermission(file.id);
    return { file, permission };
  };
  const createSharePermissionForAllFiles = async () => {
    const files = await getFiles();
    const permissions = await Promise.all(files.map((file) => createSharePermission(file.id)));
    return permissions;
  };
  const uploadFile = async (filePath) => {
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
    createSharePermissionForAllFiles
  };
};
var authClient = await authorize();
var ecoleDrive = createEcoleDriveManager(authClient);
console.log(await ecoleDrive.uploadFile("./test.txt"));
//# sourceMappingURL=ecole-drive.mjs.map
