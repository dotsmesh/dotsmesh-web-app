/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    if (args.type === 'cc') { // Contacts connect
        var userID = args.sender;
        var context = args.context;
        var data = x.unpack(args.data);
        if (data.name === 'c') { // connect
            accessKey = data.value;
            if (typeof accessKey === 'string') { // better validate
                var invitationSource = null;
                if (context.type === 'contact') {
                    invitationSource = x.pack('u', context.id);
                } else if (context.type === 'connectKey') {
                    invitationSource = x.pack('k', context.key);
                } else if (context.type === 'group') {
                    invitationSource = x.pack('g', context.id);
                }
                if (await library.addRequest(userID, accessKey, invitationSource)) {
                    var contact = await library.get(userID);
                    var profile = await x.user.getProfile(userID);

                    var notification = await x.notifications.make('c$' + userID);
                    notification.visible = true;
                    if (contact !== null && contact.providedAccessKey !== null) {
                        notification.title = 'Connected to ' + profile.name;
                        notification.text = 'Now you can message privately'
                    } else {
                        notification.title = profile.name + ' wants to connect';
                        notification.text = 'When connected you will be able to message privately';
                    }
                    notification.image = { type: 'userProfile', id: userID };
                    notification.onClick = { location: 'user/home', args: { userID: userID } };
                    notification.deleteOnClick = true;
                    notification.tags = ['c'];
                    await x.notifications.set(notification);
                }
            }
        }
    }
}