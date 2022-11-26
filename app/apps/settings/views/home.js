/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var title = 'Settings';
    x.setTitle(title);
    x.setTemplate('column');

    x.addToProfile(x.makeAppPreviewComponent('settings', {
        title: title
    }));

    var list = x.makeList({ type: 'blocks' });

    list.add(x.makeTextButton(async () => {
        x.alert('Currently, English is the only supported language. Contact us and tell us which one we should add next.');
    }, 'Language', { details: 'English' }));

    // list.add(x.makeTextButton(async () => {
    //     x.alert('Not implemented yet!');
    // }, 'Theme', 'Default'));

    // if (x.currentUser.exists()) {
    //     x.addToolbarButton(async () => {
    //         await x.currentUser.logout();    
    //     }, 'logout', 'right');
    // }
    list.add(x.makeComponent(async () => {
        var list = x.makeList();

        list.add(x.makeTextButton(async () => {
            x.open('system/manageDeviceNotifications', {}, { modal: true, width: 300 });
        }, 'Device notifications', { details: x.deviceHasPushManagerSupport() && await x.currentUser.getDeviceNotificationsStatus() === 'enabled' ? 'Enabled' : 'Disabled' }));

        return list;
    }, { observeChanges: ['deviceNotificationsStatus'] }));

    list.add(x.makeTextButton(async () => {
        if (await x.confirm('Are you sure you want to remove the locally stored data?', { icon: 'delete' })) {
            x.showLoading();
            // announce clear local caches too
            await x.currentUserCache.clear();
            await x.appCache.clear();
            x.hideLoading();
            x.alert('Cache is cleared successfully!');
        }
    }, 'Clear cache', { details: 'Remove locally stored data' }));

    //list.add(x.makeSeparator());

    list.add(x.makeTextButton(async () => {
        x.open('settings/feedback', {}, { modal: true, width: 400 });
    }, 'Feedback', { details: 'Share your app experience with the Dots Mesh team' }));

    list.add(x.makeTextButton(async () => {
        x.open('settings/about', {}, { modal: true, width: 300 });
    }, 'About', { details: 'Learn more about this app' }));

    //list.add(x.makeSeparator());

    if (x.currentUser.isPublic()) {

        // x.add(x.makeTextButton(async () => {
        //     x.alert('Not implemented yet!');
        // }, 'View active sessions', ''));

        list.add(x.makeTextButton(async () => {
            x.open('user/changePassword', {}, { modal: true, width: 300 });
        }, 'Change password', { details: 'Change your account\'s password' }));

        // x.add(x.makeTextButton(async () => {
        //     x.alert('Not implemented yet!');
        // }, 'Export data', ''));

        // x.add(x.makeTextButton(async () => {
        //     x.alert('Not implemented yet!');
        // }, 'Delete account', ''));
    }

    list.add(x.makeTextButton(async () => {
        await x.currentUser.logout();
    }, 'Log out', { details: 'Remove your account from this device' }));

    x.add(list);

};