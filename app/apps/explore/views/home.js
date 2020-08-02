async (args, library) => {
    x.setTitle('Explore');

    x.add(x.makeTitle('Explore'));

    var following = await library.getFollowing();

    var followingCount = following.length;
    if (followingCount > 0) {
        x.add(x.makeHint(followingCount === 1 ? 'Following 1 profile' : 'Following ' + followingCount + ' profiles'));
    }

    var component = x.makePostsListComponent(async () => {
        var posts = await library.getPropertiesPosts(following, { order: 'desc', limit: 20 });
        library.updateAllProperties(5 * 60);
        return posts;
    }, {
        showGroup: true,
        emptyText: 'This is a place where the posts of all the people and groups you follow are listed. You can easily dive into a specific post to share and discuss.'
    });
    component.observeChanges(['temp_explore']);
    x.add(component);

    x.add(x.makeSmallTitle('Suggestions'));
    x.add(x.makeHint('These are just a few profiles you can follow to get started. Invite your friends to make this screen more personal.'));

    x.add(x.makeComponent(async () => {
        let list = x.makeList({ type: 'grid' });
        var userIDs = ['ivo', 'dailyquotes', 'photodobo'];
        for (var i = 0; i < userIDs.length; i++) {
            var userID = x.getFullID(userIDs[i]);
            list.add(await x.makeProfileButton('user', userID, { details: x.getShortID(userID) }));
        }
        return list;
    }));

    // x.addToolbarButton(async () => {
    //     await library.updateAllProperties();
    //     x.announceChanges(['explore/list']);
    // }, 'refresh', 'right');
};