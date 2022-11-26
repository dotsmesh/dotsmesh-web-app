/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTitle('Notifications');

    x.addToProfile(x.makeAppPreviewComponent('home', {
        emptyTitle: 'Notifications',
        emptyText: 'This is the place where all the things that may require your attention will be shown. If empty, you can enjoy a cup of coffee, do a few pushups, or explore what others have shared.'
    }));

    // var profile = await x.user.getProfile('333.dotshost1.local');
    // var message = {};
    // message.userID = '333.dotshost1.local';
    // message.text = 'asdasdasd';
    // var threadID = 'r';
    // var notification = await x.notifications.make('m$' + threadID);
    // notification.visible = true;
    // notification.title = 'Message from ' + profile.name;
    // notification.text = message.text;
    // notification.image = { type: 'userProfile', id: message.userID };
    // notification.onClick = { location: 'messages/thread', args: { threadID: threadID } };
    // await x.notifications.set(notification);

    var groups = {
        m: { name: 'Messages', items: [] },
        c: { name: 'Contacts', items: [] },
        g: { name: 'Groups', items: [] },
        p: { name: 'Posts', items: [] },
        u: { name: 'Updates', items: [] },
        o: { name: 'Others', items: [] }
    };

    var component = x.makeComponent(async () => {
        let container = x.makeContainer({ addSpacing: true });
        var notifications = await x.notifications.getList();
        var hasContent = false;
        for (var notification of notifications) {
            if (!notification.visible) {
                continue;
            }
            var onClick = (async notification => {
                x.notifications.onClick(await x.notifications.getClickData(notification));
            }).bind(null, notification);
            var title = notification.title;
            var text = notification.text;
            var image = notification.image;
            var date = x.getHumanDate(notification.date);
            var button = null;
            if (image !== null) {
                if (image.type === 'userProfile') {
                    button = await x.makeProfileButton('user', image.id, { text: title, details: text, hint: date, onClick: onClick });
                } else if (image.type === 'groupProfile') {
                    button = await x.makeProfileButton('group', image.id, { text: title, details: text, hint: date, onClick: onClick });
                }
            }
            if (button === null) {
                button = x.makeTextButton(onClick, title, text, { details: date });
            }
            var groupID = 'o';
            var tags = notification.tags;
            if (tags.indexOf('m') !== -1) {
                groupID = 'm';
            } else if (tags.indexOf('c') !== -1) {
                groupID = 'c';
            } else if (tags.indexOf('p') !== -1) {
                groupID = 'p';
            } else if (tags.indexOf('r') !== -1) {
                groupID = 'u';
            } else if (tags.indexOf('g') !== -1) {
                groupID = 'g';
            }
            groups[groupID].items.push(button);
            hasContent = true;
        }
        for (var groupID in groups) {
            var group = groups[groupID];
            var items = group.items;
            if (items.length > 0) {
                container.add(x.makeSmallTitle(group.name));
                let list = x.makeList();
                for (var item of items) {
                    list.add(item);
                }
                container.add(list);
            }
        }
        if (hasContent) {
            x.setTemplate();
            return container;
        } else {
            x.setTemplate('empty');
            return null;
            // return x.makeHint('This is the place where all the things that require your attention will be shown. If empty, you can enjoy a cup of coffee, do a few pushups, or explore what others have shared.', { align: 'center' })
        }
    }, { observeChanges: ['notifications'] });
    x.add(component);
};