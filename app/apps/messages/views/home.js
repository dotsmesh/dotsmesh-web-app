/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var title = 'Messages';
    x.setTitle(title);
    //x.setTemplate('column');

    if (x.currentUser.isPrivate()) {
        x.addToProfile(x.makeAppPreviewComponent('messages', {
            emptyTitle: title,
            emptyText: 'This feature is currently available for public profiles only.'
        }));
        x.setTemplate('empty');
    } else {

        // x.add(x.makeTitle('Messages', {
        //     buttonOnClick: () => {
        //         x.pickContact((userID) => { // todo must be connected
        //             x.open('messages/thread', { userID: userID });
        //         })
        //     }
        // }));

        x.addToProfile(x.makeAppPreviewComponent('messages', {
            emptyTitle: title,
            emptyText: 'A private communication channel with your contacts.',
            actionButton: async () => {
                return {
                    onClick: async () => {
                        x.pickContact((userID) => { // todo must be connected
                            x.open('messages/thread', { userID: userID });
                        })
                    },
                    text: 'New chat'
                }
            },
        }));

        // x.add(x.makeTitle('Messages', {
        // }));

        // x.add(x.makeButton('New chat', () => {
        //     x.pickContact((userID) => { // todo must be connected
        //         x.open('messages/thread', { userID: userID });
        //     })
        // }, { style: 'style2' }));

        // x.add(x.makeIconButton(() => {
        //     x.pickContact((userID) => { // todo must be connected
        //         x.open('messages/thread', { userID: userID });
        //     })
        // }, 'x-icon-plus-white', 'New message'));//, null, true

        var component = x.makeComponent(async () => {
            var threads = await library.getLatestThreads();
            var threadsCount = threads.length;
            if (threadsCount === 0) {
                x.setTemplate('empty');
                return null;
            } else {
                x.setTemplate();
                var list = x.makeList();
                for (var i = 0; i < threadsCount; i++) {
                    let thread = threads[i];
                    let otherParticipantsIDs = thread.otherParticipantsIDs;
                    var details = '';
                    if (thread.message !== null) {
                        var message = thread.message;
                        var senderName = (await x.user.getProfile(message.userID)).name;
                        var text = message.text;
                        if (message.textType === 'r') {
                            text = x.convertRichText(text, 'text');
                        }
                        details = senderName + ': ' + x.stringReplaceAll(text, "\n", " ");
                    }
                    let item = await x.makeProfileButton('user', otherParticipantsIDs[0], {
                        details: details,
                        onClick: { location: 'messages/thread', args: { threadID: thread.id }, preload: true }
                    });
                    var notificationID = 'm$' + thread.id;
                    if (await x.notifications.exists(notificationID)) {
                        item.element.setAttribute('x-notification-badge', '');
                    }
                    component.observeChanges(['notifications/' + notificationID]);
                    list.add(item);
                }
                return list;
            }
        }, {
            observeChanges: ['messages']
        })
        x.add(component);
    }
};