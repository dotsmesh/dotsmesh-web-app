/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    var userID = args.userID !== undefined ? args.userID : x.currentUser.getID();
    var connectKey = args.connectKey !== undefined ? args.connectKey : null;

    x.addErrorHandler(['userNotFound'], async () => {
        x.showMessage('There is no profile named  ' + x.getShortID(userID) + '!');
    });
    x.addErrorHandler(['invalidUserID'], async () => {
        x.showMessage('Profile not found!');
    });
    x.addErrorHandler(['propertyUnavailable'], async () => {
        x.showMessage(x.getShortID(userID) + '\'s profile is currently unavailable!');
    });
    if (userID === null) {
        throw x.makeAppError('invalidUserID');
    }

    var isCurrentUser = x.currentUser.isMatch(userID);
    var currentUserExists = x.currentUser.exists();

    if (x.isPublicID(userID)) {
        x.setHash(x.getShortID(userID) + (connectKey !== null ? '/c/' + connectKey : ''));
    }

    if (isCurrentUser) {
        x.setTitle('My public profile');
    } else {
        x.wait(async () => {
            var profile = await x.user.getProfile(userID);
            x.setTitle(profile.name + '\'s public profile');
        })
    }

    var emptyText = null;
    if (isCurrentUser) {
        if (x.currentUser.isPublic()) {
            emptyText = 'All your posts are publicly visible by everyone, including your contacts and followers. They can share easily with their audience too.';
        } else {
            emptyText = 'You are currently signed in with a private profile. Your profile exists only on this device, but you can freely follow others, build a contacts list and join groups.';
            x.setTemplate('empty');
        }
    }

    x.addToProfile(x.makeProfilePreviewComponent('user', userID, {
        showEditButton: isCurrentUser,
        connectKey: connectKey,
        actionButton: async () => {
            if (isCurrentUser && x.currentUser.isPublic()) {
                return {
                    onClick: () => {
                        x.open('posts/form', { userID: x.currentUser.getID() }, { modal: true });
                    },
                    text: 'New post'
                }
            }
            return null;
        },
        emptyText: emptyText
    }));

    if (x.isPublicID(userID)) {
        var listComponent = await x.makePostsListComponent(async (options) => {
            var result = await x.property.getPosts('user', userID, { order: options.order, offset: options.offset, limit: options.limit, cacheList: true, cacheValues: true });
            if (!isCurrentUser) {
                x.property.checkForNewPosts('user', userID, result.length > 0 ? result[0].id : null);
            }
            x.setTemplate(result.length === 0 ? 'empty' : null);
            return result;
        }, {
            showUser: false
        });
        listComponent.observeChanges(['user/' + userID + '/profile', 'user/' + userID + '/posts']);
        x.add(listComponent);

        if (!isCurrentUser && currentUserExists) {
            x.addToolbarNotificationsButton(
                'up$' + userID,
                (action) => {
                    return {
                        appID: 'user',
                        name: 'modifyUserPostsNotification',
                        args: { action: action, userID: userID, lastSeenPosts: listComponent.getLastSeen() }
                    }
                },
                'Get notified when there are new posts here.',
                'You\'ll receive a notification when there are new posts here.'
            );
            x.windowEvents.addEventListener('show', async () => {
                await library.updateUserPostsNotification(userID, { lastSeenPosts: listComponent.getLastSeen() });
            });
        }
    }

};
