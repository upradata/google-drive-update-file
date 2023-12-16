// src/ecole-drive.mts
import path3, { basename } from "path";
import { authenticate } from "@google-cloud/local-auth";
import { google as google2 } from "googleapis";

// src/metadata.mts
import fs from "fs-extra";
var metadataInit = {
  cachedFiles: []
};
var createMetadataManager = (metadataFiles) => {
  const load = async () => {
    const datas = await Promise.all(Object.entries(metadataFiles).map(async ([name, filePath]) => {
      await fs.ensureFile(filePath);
      const data = await fs.readFile(filePath, "utf-8") || metadataInit[name];
      if (!data)
        return [name, void 0];
      return [name, JSON.parse(data)];
    }));
    return Object.fromEntries(datas);
  };
  const save = async (metadataName, data) => {
    return fs.writeFile(metadataFiles[metadataName], JSON.stringify(data), "utf-8");
  };
  return {
    load,
    save,
    metadataFiles
  };
};

// src/util.mts
import fs2 from "fs-extra";
import path from "path";
var findUpDirectory = async (dir, condition) => {
  const isRoot = (filepath) => path.dirname(filepath) === filepath;
  const findUp = async (currentDir) => {
    if (await condition(currentDir))
      return currentDir;
    if (isRoot(currentDir))
      throw new Error(`Could not find the directory complying with the condition starting from directory "${dir}" going up to the system root.`);
    return findUp(path.resolve(currentDir, ".."));
  };
  return findUp(dir);
};
var fileExists = async (filepath, options = {}) => {
  try {
    const stats = await fs2.stat(filepath);
    if (options.type === "directory")
      return stats.isDirectory();
    if (options.type === "file")
      return stats.isFile();
    return true;
  } catch {
    return false;
  }
};
var findPackageJsonDirectory = (dir) => findUpDirectory(
  dir,
  async (d) => await fileExists(path.join(d, "package.json"), { type: "file" })
);

// src/ecole-drive.mts
import { fileURLToPath } from "node:url";

// src/ecole-drive-manager.mts
import { createReadStream as createFsReadStream } from "node:fs";
import path2 from "path";
import { google } from "googleapis";
var createEcoleDriveManager = (authClient2, metadata2) => {
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
        name: path2.basename(filePath),
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
    const fileName = path2.basename(filePath);
    const getFileId = async () => {
      const cachedFile = metadata2.cachedFiles.find((f) => f.localPath === filePath || f.name === path2.basename(filePath));
      if (cachedFile)
        return cachedFile.googleDriveFileId;
      return (await searchFile(fileName))?.id;
    };
    const fileId = await getFileId();
    if (fileId) {
      await updateFile(fileName, fileId);
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
    createSharePermissionForAllFiles
  };
};

// src/ecole-drive.mts
var SCOPES = [
  // 'https://www.googleapis.com/auth/drive.metadata.readonly',
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata",
  "https://www.googleapis.com/auth/drive.scripts"
];
var __dirname = path3.dirname(fileURLToPath(import.meta.url));
var packageJsonDir = await findPackageJsonDirectory(__dirname);
var metadataManager = createMetadataManager({
  token: path3.join(packageJsonDir, "metadata/token.json"),
  credentials: path3.join(packageJsonDir, "metadata/credentials.json"),
  cachedFiles: path3.join(packageJsonDir, "metadata/files.json")
});
var metadata = await metadataManager.load();
var loadSavedCredentialsIfExist = async () => {
  try {
    return google2.auth.fromJSON(metadata.credentials.installed || metadata.credentials.web);
  } catch (err) {
    return null;
  }
};
var saveCredentials = async (client) => {
  const credential = metadata.credentials.installed || metadata.credentials.web;
  const token = {
    type: "authorized_user",
    client_id: credential.client_id,
    client_secret: credential.client_secret,
    refresh_token: client.credentials.refresh_token
  };
  await metadataManager.save("token", token);
};
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client)
    return client;
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: metadataManager.metadataFiles.credentials
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}
var authClient = await authorize();
var ecoleDrive = createEcoleDriveManager(authClient, metadata);
var uploadFileInEcole = async (filePath) => {
  const fileId = await ecoleDrive.uploadFile(filePath);
  if (fileId) {
    const cachedFile = {
      googleDriveFileId: fileId,
      localPath: filePath,
      name: basename(filePath)
    };
    metadata.cachedFiles = [...metadata.cachedFiles, cachedFile];
    await metadataManager.save("cachedFiles", metadata.cachedFiles);
  }
};
console.log(await uploadFileInEcole("./test.txt"));
//# sourceMappingURL=ecole-drive.mjs.map
