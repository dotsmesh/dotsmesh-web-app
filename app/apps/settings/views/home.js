async (args, library) => {

    x.setTitle('Settings');
    x.setTemplate('column-tiny');

    x.add(x.makeTitle('Settings'));

    var container = x.makeContainer();

    var list = x.makeList();

    list.add(x.makeTextButton(async () => {
        x.alert('Not implemented yet!');
    }, 'Language', 'English'));

    list.add(x.makeTextButton(async () => {
        x.alert('Not implemented yet!');
    }, 'Theme', 'Default'));

    container.add(list);


    // if (x.currentUser.exists()) {
    //     x.addToolbarButton(async () => {
    //         await x.currentUser.logout();    
    //     }, 'logout', 'right');
    // }


    container.add(x.makeSeparator());

    var list = x.makeList();

    list.add(x.makeTextButton(async () => {
        await x.cache.clear(); // announce clear local caches too
        x.alert('Done!');
    }, 'Clear cache', ''));

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