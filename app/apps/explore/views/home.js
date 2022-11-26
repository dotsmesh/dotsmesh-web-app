/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var title = 'Explore';
    x.setTitle(title);

    x.addToProfile(x.makeAppPreviewComponent('explore', {
        emptyTitle: title,
        emptyText: 'This is the place where the posts of all the people and groups you follow will be listed. You can easily dive into a specific post to share and discuss.'
    }));

    x.addToolbarButton('Who am I following', async () => {
        x.open('explore/following');
    }, 'settings');

    // var component = x.makeComponent(async () => {
    //     var following = await library.getFollowing();

    //     var container = x.makeContainer({ addSpacing: true, align: 'center' });

    //     var followingCount = following.length;
    //     if (followingCount > 0) {
    //         var profilesCount = 0;
    //         var groupsCount = 0;
    //         for (var typedPropertyID of following) {
    //             var propertyData = x.parseTypedID(typedPropertyID);
    //             if (propertyData.type === 'group') {
    //                 groupsCount++;
    //             } else {
    //                 profilesCount++;
    //             }
    //         }

    //         var text = null;
    //         if (profilesCount > 1) {
    //             if (groupsCount > 1) {
    //                 text = profilesCount + ' profiles and ' + groupsCount + ' groups';//'Following ' + 
    //             } else if (groupsCount === 1) {
    //                 text = profilesCount + ' profiles and 1 group';//'Following ' + 
    //             } else {
    //                 text = profilesCount + ' profiles';//'Following ' + 
    //             }
    //         } else if (profilesCount === 1) {
    //             if (groupsCount > 1) {
    //                 text = '1 profile and ' + groupsCount + ' groups';//Following 
    //             } else if (groupsCount === 1) {
    //                 text = '1 profile and 1 group';//Following 
    //             } else {
    //                 text = '1 profile';//Following 
    //             }
    //         } else if (groupsCount > 1) {
    //             text = groupsCount + ' groups';//'Following ' + 
    //         } else if (groupsCount === 1) {
    //             text = '1 group';//Following 
    //         }

    //         if (text !== null) {
    //             container.add(x.makeButton(text, () => {
    //                 x.open('explore/following');
    //             }));
    //         }
    //     }
    //     return container;
    // });
    // component.observeChanges(['temp_explore', 'explore/following']);

    //x.addToProfile(component);

    //var component = x.makeComponent(async () => {
    var following = await library.getFollowing();

    //var container = x.makeContainer({ addSpacing: true });

    var listComponent = await x.makePostsListComponent(async (options) => {
        var posts = await library.getPropertiesPosts(following, { order: options.order, offset: options.offset, limit: options.limit });
        library.updateAllProperties(5 * 60);
        x.setTemplate(posts.length > 0 ? null : 'empty');
        return posts;
    }, {
        showGroup: true
    });
    listComponent.observeChanges(['temp_explore', 'explore/following']);
    x.add(listComponent);
    // await postsList.promise;
    // container.add(postsList);
    // return container;
    //});
    //component.observeChanges(['temp_explore', 'explore/following']);

    //x.add(component);

    // x.add(x.makeSmallTitle('Suggestions'));
    // x.add(x.makeHint('These are just a few profiles you can follow to get started. Invite your friends to make this screen more personal.'));

    // x.add(x.makeComponent(async () => {
    //     let list = x.makeList({ type: 'grid' });
    //     var userIDs = ['ivo', 'dailyquotes', 'photodobo'];
    //     for (var i = 0; i < userIDs.length; i++) {
    //         var userID = x.getFullID(userIDs[i]);
    //         list.add(await x.makeProfileButton('user', userID, { details: x.getShortID(userID) }));
    //     }
    //     return list;
    // }));

    // x.addToolbarButton(async () => {
    //     await library.updateAllProperties();
    //     x.announceChanges(['explore/list']);
    // }, 'refresh', 'right');
};