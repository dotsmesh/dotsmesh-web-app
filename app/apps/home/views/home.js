/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTitle('Notifications');

    x.setTemplate('column-big');

    x.add(x.makeTitle('Notifications'));

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
        let container = x.makeContainer(true);
        var notifications = await x.notifications.getList();
        var hasContent = false;
        for (var notification of notifications) {
            if (!notification.visible) {
                continue;
            }
            //if (hasContent === false) {
            //container.add(x.makeHint('All the things you may want to check out:'));
            //}
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
                button = x.makeTextButton(onClick, title, text, date);
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
            return container;
        } else {
            return x.makeHint('This is the place where all the things that require your attention will be shown. If empty, you can enjoy a cup of coffee, do a few pushups, or explore what others have shared.')
        }
    }, { observeChanges: ['notifications'] });
    x.add(component);

    // var element = document.createElement('div');
    // element.setAttribute('class', 'x-icon-tick-white');
    // element.setAttribute('style', 'width:100%;height:100%;background-repeat:no-repeat;background-size:100px;background-position:center;opacity:0.3;font-size:15px;line-height:160%;color:#fff;text-align:center;display:flex;justify-content:center;align-items:center;');
    // element.innerHTML = '<br><br><br><br><br><br>Nothing urgent!<br>Time for a coffee?';
    // x.add(element);



    //x.add(x.makeSmallTitle('Suggestions'));

    // x.add(x.makeSeparator());
    // x.add(x.makeSmallTitle('Messages'));

    // x.add(x.makeSeparator());
    // x.add(x.makeSmallTitle('New contacts'));

    // x.add(x.makeSeparator());
    // x.add(x.makeTitle('Contacts updates'));

    // x.add(x.makeSeparator());
    // x.add(x.makeTitle('Groups updates'));
    // x.add(x.makeHint('No groups'));

};