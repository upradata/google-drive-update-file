import fs from 'fs-extra';
import path from 'node:path';


export const findUpDirectory = async (dir: string, condition: (currentDir: string) => Promise<boolean>): Promise<string> => {
    const isRoot = (filepath: string) => path.dirname(filepath) === filepath;

    const findUp = async (currentDir: string) => {

        if (await condition(currentDir))
            return currentDir;

        if (isRoot(currentDir))
            throw new Error(`Could not find the directory complying with the condition starting from directory "${dir}" going up to the system root.`);

        return findUp(path.resolve(currentDir, '..'));
    };

    return findUp(dir);
};


export const fileExists = async (filepath: string, options: { type?: 'file' | 'directory'; } = {}): Promise<boolean> => {
    try {
        const stats = (await fs.stat(filepath));

        if (options.type === 'directory')
            return stats.isDirectory();

        if (options.type === 'file')
            return stats.isFile();

        return true;
    } catch {
        return false;
    }
};

export const findPackageJsonDirectory = (dir: string) => findUpDirectory(
    dir,
    async d => await fileExists(path.join(d, 'package.json'), { type: 'file' })
);
