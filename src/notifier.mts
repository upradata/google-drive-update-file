// import macOSNotifier from 'node-notifier';
import _macOsDisplayNotification from 'display-notification';
import { platform } from 'node:os';

type MacOsDisplayNotification = (options: {
    title?: string;
    subtitle?: string;
    text: string;
    sound?: string;
}) => Promise<void>;

const macOsDisplayNotification = _macOsDisplayNotification as MacOsDisplayNotification;

// declare module 'display-notification' {
//     const display: () => Promise<void>;
//     export default display;
// }
// const NotificationCenter = macOSNotifier.NotificationCenter;

// var notifier = new NotificationCenter({
//     withFallback: false, // Use Growl Fallback if <= 10.8
//     customPath: undefined // Relative/Absolute path to binary if you want to use your own fork of terminal-notifier
// });


export type NotificationOptions = {
    title?: string;
    subtitle?: string;
    message: string;
    sound?: string;
};

export const displayNotification = async (options: NotificationOptions) => {
    if (platform() === 'darwin') {
        // macOSNotifier
        await macOsDisplayNotification({
            ...options,
            text: options.message,
            title: 'Google Drive uploader',
            sound: 'Frog'
        });

        // NOT WORKING
        // notifier.notify({
        //     title: 'Google Drive uploader',
        //     sound: true, // 'Frog',
        //     closeLabel: 'Fermer',
        //     // icon: path.join(__dirname, 'coulson.jpg'), // Absolute path (doesn't work on balloons)
        //     ...options
        // });
    }
};