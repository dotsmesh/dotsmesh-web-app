/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

() => {

    var updateUserPostsNotification = async (userID, update) => {
        var notificationID = 'up$' + userID;
        var notification = await x.notifications.get(notificationID);
        if (notification === null) {
            return;
        }

        if (update.lastPosts !== undefined) {
            if (x.isSameContent(notification.data.i, update.lastPosts)) {
                return;
            }
            notification.data.i = update.lastPosts;
        } else if (update.lastSeenPosts !== undefined) {
            if (x.isSameContent(notification.data.l, update.lastSeenPosts)) {
                return;
            }
            notification.data.l = update.lastSeenPosts;
        } else {
            throw new Error();
        }

        var lastPostsIDs = x.shallowCopyArray(notification.data.i);
        var lastSeenPostsIDs = x.shallowCopyArray(notification.data.l);

        lastPostsIDs.sort().reverse();
        lastSeenPostsIDs.sort().reverse();
        var lastSeenPostID = null;
        for (var postID of lastSeenPostsIDs) {
            if (lastPostsIDs.indexOf(postID) !== null) {
                lastSeenPostID = postID;
                break;
            }
        }
        var notSeenPosts = [];
        if (lastSeenPostID !== null) {
            var index = lastPostsIDs.indexOf(lastSeenPostID);
            if (index === 0) {
                // seen all
            } else {
                notSeenPosts = lastPostsIDs.slice(0, index);
            }
        } else {
            // cannot find
            notSeenPosts = lastPostsIDs.slice(0, 11); // to show 10+
        }

        var notSeenPostsCount = notSeenPosts.length;
        if (notSeenPostsCount > 0) {
            if (!x.isSameContent(notification.data.n, notSeenPosts)) {
                var profile = await x.property.getProfile('user', userID);
                //var title = '';
                var text = '';
                if (notSeenPostsCount === 1) {
                    //title = 'New post by ';
                    text = '1 new post';
                } else if (notSeenPostsCount === 11) {
                    //title = 'News posts by ';
                    text = '10+ new posts';
                } else {
                    //title = 'News posts by ';
                    text = notSeenPostsCount + ' new posts';
                }
                //title += profile.name;
                //text += profile.name;

                notification.visible = true;
                notification.title = profile.name;
                notification.text = text;
                notification.image = { type: 'userProfile', id: userID };
                notification.data.n = notSeenPosts;
                notification.tags = ['u', 'p'];
            }
        } else {
            notification.visible = false;
            notification.title = null;
            notification.text = null;
        }
        await x.notifications.set(notification);
    };

    var modifyUserPostsNotification = async (action, userID, lastSeenPosts) => {
        var notificationID = 'up$' + userID;
        if (action === 'add') {
            await x.property.observeChanges(userID, ['up'], 'n');
            var notification = await x.notifications.make(notificationID);
            notification.data = { l: lastSeenPosts, i: [], n: [] };
            notification.onClick = { location: 'user/home', args: { userID: userID } };
            await x.notifications.set(notification);
        } else {
            await x.property.unobserveChanges(userID, ['up'], 'n');
            await x.notifications.delete(notificationID);
        }
    };

    var getProfileImage = async (userID, size) => {
        var profile = await x.user.getProfile(userID);
        return await profile.getImage(size);
    };

    return {
        updateUserPostsNotification: updateUserPostsNotification,
        modifyUserPostsNotification: modifyUserPostsNotification,
        getProfileImage: getProfileImage
    };
};