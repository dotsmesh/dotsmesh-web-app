/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    //console.log(args);
    var changes = args.changes;
    for (var change of changes) {
        if (change.key === 'up') {
            var userID = change.propertyID;
            var notificationID = 'up$' + userID;
            if (await x.notifications.exists(notificationID)) {
                var posts = await x.services.call('posts', 'getRawPosts', { propertyType: 'user', propertyID: userID, options: { order: 'desc', offset: 0, limit: 200, ignoreValues: true, cacheList: true, ignoreListCache: true } }); // todo update limit
                var postsIDs = Object.keys(posts);
                await library.updateUserPostsNotification(userID, { lastPosts: postsIDs });
            }
        }
    }

}