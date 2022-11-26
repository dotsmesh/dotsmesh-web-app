/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    var isReminderMode = args.mode === 'r';

    x.setTitle('Device notifications');

    x.add(x.makeIcon('push-notifications'));

    if (x.deviceHasPushManagerSupport()) {
        var enabled = await x.currentUser.getDeviceNotificationsStatus() === 'enabled';

        x.add(x.makeText(enabled ? 'Device notifications are currently enabled!' : 'Device notifications are currently disabled!', { align: 'center' }));
        if (isReminderMode && !enabled) {
            x.add(x.makeText('Enable them to get the updates you\'ve subscribed to instantly, without having to manually open the app. You can disable them later from the settings.', { align: 'center' }));
        }

        x.add(x.makeButton(enabled ? 'Disable' : 'Enable', async () => {
            x.showLoading();
            if (enabled) {
                if (await x.currentUser.disableDeviceNotifications()) {
                    await x.back();
                } else {
                    x.hideLoading();
                    x.showMessage('Cannot disable device notifications! Please, try again later.');
                }
            } else {
                if (await x.currentUser.enableDeviceNotifications()) {
                    await x.back();
                } else {
                    x.hideLoading();
                    x.showMessage('Cannot enable device notifications! Please, check your browser settings or try again later.');
                }
            }
        }, { marginTop: 'big' }));
    } else {
        x.add(x.makeText('Your device/browser does not support notifications!', { align: 'center' }));
        x.add(x.makeButton('OK', () => {
            x.back();
        }, { marginTop: 'big' }));
    }
};
