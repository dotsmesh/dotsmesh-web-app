/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTemplate('columns-profile');
    var userID = args.userID === undefined ? x.currentUser.getID() : args.userID;
    var connectKey = args.connectKey !== undefined ? args.connectKey : null;

    if (userID === null) {
        throw new Error();
    }

    x.addErrorHandler(['userNotFound'], async () => {
        x.showMessage('There is no profile named  ' + x.getShortID(userID) + '!');
    });

    x.addErrorHandler(['invalidUserID'], async () => {
        x.showMessage('Profile not found!');
    });

    x.addErrorHandler(['propertyUnavailable'], async () => {
        x.showMessage(x.getShortID(userID) + '\'s profile is currently unavailable!');
    });

    if (x.isPublicID(userID)) {
        x.setHash(x.getShortID(userID) + (connectKey !== null ? '/c/' + connectKey : ''));
    }
    var isCurrentUser = userID === x.currentUser.getID();
    var currentUserExists = x.currentUser.exists();

    if (isCurrentUser) {
        x.setTitle('My public profile');
    } else {
        x.wait(async () => {
            var profile = await x.user.getProfile(userID);
            x.setTitle(profile.name + '\'s public profile');
        })
    }

    x.add(x.makeProfilePreviewComponent('user', userID, {
        showEditButton: isCurrentUser,
        connectKey: connectKey
    }), { template: 'column1' });

    if (isCurrentUser && x.currentUser.isPrivate()) {
        x.add(x.makeHint('You are currently signed in with a private profile. Your profile exists only on this device, but you can freely follow others, build a contacts list and join groups.'), { template: 'column2' });
    } else {

        x.add(x.makeTitle('Recently published'), { template: 'column2' });

        var listComponent = x.makePostsListComponent(async options => {
            var result = await x.property.getPosts('user', userID, { order: 'desc', limit: 20, cacheList: true, cacheValues: true });
            if (!isCurrentUser) {
                x.property.checkForNewPosts('user', userID, result.length > 0 ? result[0].id : null);
            }
            return result;
        }, {
            addButton: () => {
                if (isCurrentUser) {
                    return {
                        onClick: () => {
                            x.open('posts/form', { userID: userID }, { modal: true });
                        },
                        text: 'New post'
                    }
                }
                return null;
            },
            showUser: false,
            emptyText: isCurrentUser ? 'All your posts are be publicly visible by everyone, including your contacts and followers. They can share easily with their audience too.' : 'No posts have been published yet.'
        });
        listComponent.observeChanges(['user/' + userID + '/profile', 'user/' + userID + '/posts']);
        x.add(listComponent, { template: 'column2' });

        if (!isCurrentUser && currentUserExists) {
            x.addToolbarNotificationsButton('up$' + userID, action => {
                return {
                    appID: 'user',
                    name: 'modifyUserPostsNotification',
                    args: { action: action, userID: userID, lastSeenPosts: listComponent.getLastSeen() }
                }
            }, 'Get notified when there are new posts here.');
            x.windowEvents.addEventListener('show', async () => {
                await library.updateUserPostsNotification(userID, { lastSeenPosts: listComponent.getLastSeen() });
            });
        }
    }

};
