
/**
 * 
 * @param {string[]} outputPdfFiles 
 * @param {*} parameters 
 * @returns 
 */
function run(outputPdfFiles, parameters) {

    const app = Application.currentApplication();
    app.includeStandardAdditions = true;

    function displayNotification(message, subTitle) {
        app.displayNotification(message, {
            withTitle: "Google Drive",
            subtitle: subTitle || '',
            soundName: "Frog"
        });
    }

    if (outputPdfFiles.length === 0) {
        displayNotification("", "Aucune \"traces écrites\" à synchroniser sur Google Drive");
    } else {
        const files = outputPdfFiles.map(file => {
            // we remove the first part because it is the drive name not handled by nodejs
            const parts = file.split(':').slice(1);

            const filePath = '/' + parts.join('/');

            return { filePath, fileName: parts.slice(-1)[ 0 ] };
        });

        const filesAsString = files.map(f => '"' + f.filePath + '"').join(' ');
        const command = '/Users/jamnickam/Thomas/GoogleDriveUploadFile/ecole-drive.sh';

        const metadataDir = '/Users/jamnickam/Miska/.google-drive-upload-metadata';
        const args = [ '--metadataDir', metadataDir, '--logOutputVerbose', '--logOutputFilenames', '--enableNotification' ].join(' ');

        const output = app.doShellScript([ command, args, filesAsString ].join(' '));
        displayNotification(JSON.stringify(output), 'Test');

        // var dirname = outputPdfFiles[0].split(":").slice(0,-1).join(":");

        displayNotification(files.map(f => f.fileName).join('\n'), "Toutes les \"traces écrites\" sont synchronisés sur Google Drive.");

        // better this
        /* var appIcon = "/Users/jamnickam/Library/Application Support/Google/Chrome/Default/Extensions/lmjegmlicamnimmfhcmpkclmigmmcbeh/3.10_0/images/drive-sync256.png"
    	
        app.doShellScript(
            'terminal-notifier -sound Frog -appIcon ' + appIcon + ' -open URL file://' + dirname
            + '-title Google Drive'
            + '-subtitle Toutes les "traces écrites" sont synchronisées sur Google Drive.'
            + '-message ' + filenames.join("\r\n")
        ); */
    }

    return outputPdfFiles;
}