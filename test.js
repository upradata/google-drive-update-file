var require2 = function (path) {
    if (typeof app === 'undefined') {
        app = Application.currentApplication();
        app.includeStandardAdditions = true;
    }

    var handle = app.openForAccess(path);
    var contents = app.read(handle);
    app.closeAccess(path);

    var module = { exports: {} };
    var exports = module.exports;
   eval(contents);

    return module.exports;
};


var ecoleManager = require2('/Users/jamnickam/Thomas/GoogleDriveUploadFile/build-cjs-full/ecole-drive.mjs');
debugger;

function run(outputPdfFiles, parameters) {

}