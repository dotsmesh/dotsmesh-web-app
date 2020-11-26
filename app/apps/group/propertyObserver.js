/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    //console.log(args);
    var changes = args.changes;
    //console.table(changes);

    for (var change of changes) {
        if (change.key === 'gmp') {
            await x.announceChanges(['group/' + groupID + '/members']);
            var groupID = change.propertyID;
            var notificationID = 'gmp$' + groupID;
            if (await x.notifications.exists(notificationID)) {
                var usersIDs = await library.getPendingMembersUserIDs(groupID);
                await library.updatePendingMembersNotification(groupID, { usersIDs: usersIDs });
            }
        } else if (change.key === 'gma') {
            var groupID = change.propertyID;
            await x.announceChanges(['group/' + groupID + '/members']);
        } else if (change.key === 'gm') {
            var groupID = change.propertyID;
            await x.announceChanges(['group/' + groupID + '/members']);
        } else if (change.key === 'gi') {
            var groupID = change.propertyID;
            await x.announceChanges(['group/' + groupID + '/invitations']);
        } else if (change.key === 'gp') {
            var groupID = change.propertyID;
            await x.announceChanges(['group/' + groupID + '/posts']);
            var notificationID = 'gp$' + groupID;
            if (await x.notifications.exists(notificationID)) {
                try {
                    var posts = await x.services.call('posts', 'getRawPosts', { propertyType: 'group', propertyID: groupID, options: { order: 'desc', offset: 0, limit: 200, ignoreValues: true, cacheList: true, ignoreListCache: true } }); // todo update limit
                    var postsIDs = Object.keys(posts);
                    await library.updateGroupPostsNotification(groupID, { lastPosts: postsIDs });
                } catch (e) {
                    if (e.name === 'propertyUnavailable') {
                        // ignore
                    } else {
                        throw e;
                    }
                }
            }
        } else if (change.key.indexOf('gp/') === 0) {
            var groupID = change.propertyID;
            var postID = change.key.substr('gp/'.length);
            await x.announceChanges(['group/' + groupID + '/posts/' + postID]);
            var notificationID = 'gpr$' + groupID + '$' + postID;
            if (await x.notifications.exists(notificationID)) {
                try {
                    var postReactionsIDs = await x.services.call('posts', 'getPostReactionsIDs', { propertyType: 'group', propertyID: groupID, postID: postID });
                    await library.updateGroupPostReactionsNotification(groupID, postID, { lastPostReactions: postReactionsIDs });
                } catch (e) {
                    if (e.name === 'propertyUnavailable') {
                        // ignore
                    } else {
                        throw e;
                    }
                }
            }
        }
    }
}