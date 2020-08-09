/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTemplate('column-big-message-title');
    x.scrollBottom();//'column1'
    if (typeof args.userID !== 'undefined') {
        var userID = args.userID;
        var threadID = await library.getOrMakeThreadID([userID]);
    } else {
        var threadID = args.threadID;
    }
    var attachment = typeof args.attachment !== 'undefined' && args.attachment !== null ? x.attachment.unpack(null, args.attachment.value) : null;

    var recipients = await library.getThreadRecipients(threadID);

    var names = [];
    for (var i = 0; i < recipients.length; i++) {
        var profile = await x.user.getProfile(recipients[i]);
        names.push(profile.name);
    }
    x.setTitle('Messaging with ' + names.join(', '), true);

    var discussionComponent = x.makeDiscussionComponent(async listOptions => {
        var posts = await library.getThreadMessages(threadID, listOptions);
        return posts;
    });
    discussionComponent.observeChanges(['messages/' + threadID]);
    x.add(discussionComponent, { template: 'content' });//, { template: 'column1' }

    x.add(x.makeComponent(async () => {
        var post = x.posts.make();
        if (attachment !== null) {
            post.attachments.add(attachment);
        }
        var postForm = await x.makePostForm(post, {
            placeholder: 'Your message',
            clearOnSubmit: true,
            submitText: 'Send',
            type: 'small'
        });
        postForm.onSubmit = message => {
            var firstOnChange = true;
            library.addMessage(threadID, message, async message => {
                await discussionComponent.setMessage(message);
                if (firstOnChange) {
                    firstOnChange = false;
                    x.scrollBottom();//'column1'
                }
            });
        };
        return postForm;
    }), { template: 'content' });//, { template: 'column1' }

    x.windowEvents.addEventListener('show', async () => {
        await x.notifications.delete('m$' + threadID);
    });

    // x.add(x.makeTitle('Participants'), { template: 'column2' });
    // for (var i = 0; i < recipients.length; i++) {
    //     var userID = recipients[i];
    //     x.add(await x.makeProfileButton('user', userID, { text: x.getShortID(userID) }), { template: 'column2' });
    // }
    // var userID = x.currentUser.getID();
    // x.add(await x.makeProfileButton('user', userID, { text: x.getShortID(userID) }), { template: 'column2' });

};