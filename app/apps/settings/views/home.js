/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    x.setTitle('Settings');
    x.setTemplate('column-tiny');

    x.add(x.makeTitle('Settings'));

    var container = x.makeContainer();

    var list = x.makeList();

    list.add(x.makeTextButton(async () => {
        x.alert('English is the only supported language today. Contact us and tell us which one we should add next.');
    }, 'Language', 'English'));

    // list.add(x.makeTextButton(async () => {
    //     x.alert('Not implemented yet!');
    // }, 'Theme', 'Default'));

    container.add(list);


    // if (x.currentUser.exists()) {
    //     x.addToolbarButton(async () => {
    //         await x.currentUser.logout();    
    //     }, 'logout', 'right');
    // }

    container.add(x.makeSeparator());

    container.add(x.makeComponent(async () => {
        var list = x.makeList();

        list.add(x.makeTextButton(async () => {
            await x.open('system/manageDeviceNotifications', {}, { modal: true, width: 300 });
        }, 'Device notifications', x.deviceHasPushManagerSupport() && await x.currentUser.getDeviceNotificationsStatus() === 'enabled' ? 'Enabled' : 'Disabled'));

        return list;
    }, { observeChanges: ['deviceNotificationsStatus'] }));

    container.add(x.makeSeparator());

    var list = x.makeList();

    list.add(x.makeTextButton(async () => {
        await x.cache.clear(); // announce clear local caches too
        x.alert('Cache is cleared successfully!');
    }, 'Clear cache', ''));

    container.add(list);

    container.add(x.makeSeparator());

    var list = x.makeList();

    list.add(x.makeTextButton(async () => {
        x.open('settings/feedback', {}, { modal: true, width: 400 });
    }, 'Feedback', ''));

    list.add(x.makeTextButton(async () => {
        x.open('settings/about', {}, { modal: true, width: 300 });
    }, 'About', ''));

    container.add(list);

    container.add(x.makeSeparator());

    var list = x.makeList();

    if (x.currentUser.isPublic()) {

        // x.add(x.makeTextButton(async () => {
        //     x.alert('Not implemented yet!');
        // }, 'View active sessions', ''));

        list.add(x.makeTextButton(async () => {
            x.open('user/changePassword', {}, { modal: true, width: 300 });
        }, 'Change password', ''));

        // x.add(x.makeTextButton(async () => {
        //     x.alert('Not implemented yet!');
        // }, 'Export data', ''));

        // x.add(x.makeTextButton(async () => {
        //     x.alert('Not implemented yet!');
        // }, 'Delete account', ''));
    }

    list.add(x.makeTextButton(async () => {
        await x.currentUser.logout();
    }, 'Log out', ''));

    container.add(list);

    x.add(container);

};