/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    x.setTitle('Device notifications');

    var enabled = await x.currentUser.getDeviceNotificationsStatus() === 'enabled';

    x.add(x.makeText(enabled ? 'Device notifications are currently enabled!' : 'Device notifications are currently disabled!', true));

    if (enabled) {
        x.add(x.makeButton('Disable', async () => {
            x.showLoading();
            if (await x.currentUser.disableDeviceNotifications()) {
                await x.back();
            } else {
                x.hideLoading();
                x.showMessage('Cannot disable device notifications! Please, try again later.');
            }
        }));
    } else {
        x.add(x.makeButton('Enable', async () => {
            x.showLoading();
            if (await x.currentUser.enableDeviceNotifications()) {
                await x.back();
            } else {
                x.hideLoading();
                x.showMessage('Cannot enable device notifications! Please, check your browser settings or try again later.');
            }
        }));
    }
};
