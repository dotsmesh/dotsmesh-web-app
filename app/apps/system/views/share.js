/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var type = args.type;
    var value = args.value;

    var attachment = x.attachment.make();
    attachment.type = type;
    attachment.value = value;

    if (type === 'u') {
        x.setTitle('Share a profile');
    } else if (type === 'p') {
        x.setTitle('Share a post');
    } else {
        x.setTitle('Share');
    }

    x.add(x.makeAttachmentPreviewComponent(attachment, { theme: 'light' }));

    var container = x.makeContainer();

    container.add(x.makeButton('Share publicly', async () => {
        var openResult = await x.open('posts/form', {
            userID: x.currentUser.getID(),
            attachment: await attachment.pack(),
        }, { modal: true });
        // if (openResult !== null && typeof openResult.status !== 'undefined' && openResult.status === 'posted') {
        //     x.back();
        // }

    }));

    container.add(x.makeButton('Send as message', () => {
        x.pickContact(async userID => {
            await x.open('messages/thread', {
                userID: userID,
                attachment: await attachment.pack()
            });
        });
    }));

    container.add(x.makeButton('Share in a group', () => {
        x.pickGroup(async groupID => {
            var openResult = await x.open('posts/form', {
                groupID: groupID,
                attachment: await attachment.pack(),
            }, { modal: true });
            // if (openResult !== null && typeof openResult.status !== 'undefined' && openResult.status === 'posted') {
            //     x.back();
            // }
        });
    }));

    x.add(container);
};