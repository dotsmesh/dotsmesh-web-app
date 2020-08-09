/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var postID = args.postID;
    var currentUserID = x.currentUser.getID();

    var canDelete = false;
    var canReact = false;

    var propertyType = null;
    var propertyID = null;
    if (typeof args.userID !== 'undefined') { // USER
        propertyType = 'user';
        propertyID = args.userID;
        x.setHash(x.getShortID(propertyID) + '/p/' + postID);
        var profile = await x.user.getProfile(propertyID);
        x.setTitle('Public post by ' + profile.name);
        canDelete = true;
    } else if (typeof args.groupID !== 'undefined') { // GROUP
        propertyType = 'group';
        propertyID = args.groupID;
        var profile = await x.group.getProfile(propertyID);
        x.setTitle('Post in ' + profile.name + ' (group)');

        var memberGroupDetails = await x.services.call('groups', 'getDetails', { groupID: propertyID, details: ['status'] });
        if (memberGroupDetails.status === 'joined') {
            canDelete = true;
            canReact = true;
        }
    }

    x.setTemplate('column-big');

    // todo wait
    var post = await library.getPost(propertyType, propertyID, postID, { cache: true });

    if (post.userID === currentUserID && canDelete) {  // observe user join
        x.addToolbarDeleteButton(async () => {
            if (await x.confirm('Are you sure you want to delete this post?')) {
                x.showLoading();
                await library.deletePost(propertyType, propertyID, postID);
                await x.announceChanges(['user/' + currentUserID, 'posts/' + postID]);
                //await x.backPrepare();
                await x.back();
            }
        });
    }

    if (propertyType === 'user') {
        if (x.currentUser.isPublic()) {
            x.addToolbarShareButton(() => {
                x.share('p', {
                    o: x.getTypedID(propertyType, propertyID),
                    p: postID
                });
            });
        }
    }

    x.add(x.makePostPreviewComponent(() => {
        return post;
    }, { showGroup: true }));//, { template: 'column1' }

    if (propertyType === 'group') {
        //x.add(x.makeSeparator());
        var discussionComponent = x.makeDiscussionComponent(async options => {
            return await library.getPostReactions(propertyType, propertyID, postID, options);
        }, { groupID: propertyID });
        x.add(discussionComponent);//, { template: 'column1' }

        if (canReact) { // observe user join
            x.add(x.makeComponent(async () => {
                var postForm = await x.makePostForm(null, {
                    placeholder: 'Your comment',
                    clearOnSubmit: true,
                    submitText: 'Send',
                    type: 'small',
                    profilePropertyType: 'groupMember',
                    profilePropertyID: propertyID + '$' + x.currentUser.getID()
                });
                postForm.onSubmit = reaction => {
                    (async () => {
                        reaction.id = x.generateDateBasedID(); // temp id while saving
                        var firstOnChange = true;
                        await library.addPostReaction(propertyType, propertyID, postID, reaction, async reaction => {
                            await discussionComponent.setMessage(reaction);
                            if (firstOnChange) {
                                firstOnChange = false;
                                x.scrollBottom();
                            }
                        });
                        await discussionComponent.update(async () => {
                            await discussionComponent.deleteMessage(reaction.id);
                        });
                    })();
                };
                return postForm;
            }));//, { template: 'column1' }
        }

        x.addToolbarNotificationsButton('gpr$' + propertyID + '$' + postID, action => {
            return {
                appID: 'group',
                name: 'modifyGroupPostReactionsNotification',
                args: { action: action, groupID: propertyID, postID: postID, lastSeenPostReactions: discussionComponent.getLastSeen() }
            }
        }, 'Get notified when there is activity in this post.');
        x.windowEvents.addEventListener('show', async () => {
            await x.services.call('group', 'updateGroupPostReactionsNotification', { groupID: propertyID, postID: postID, lastSeenPostReactions: discussionComponent.getLastSeen() });
        });
    }

    // x.add(x.makeTitle('Author'), { template: 'column2' });
    // x.add(await x.makeProfileButton('user', post.userID, { text: x.getShortID(post.userID) }), { template: 'column2' });
    // if (propertyType === 'group') {
    //     x.add(x.makeTitle('Group'), { template: 'column2' });
    //     x.add(await x.makeProfileButton('group', propertyID), { template: 'column2' });
    // }
    //x.add(x.makeHint('Published on 21 Nov, 2020 (23 days ago)'), { template: 'column2' });
};