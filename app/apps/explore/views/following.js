/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTitle('Followed profiles and groups');
    //x.add(x.makeTitle('Followed profiles and groups'));

    x.addToProfile(x.makeAppPreviewComponent('explore', {
        hint: 'Followed profiles and groups',
        emptyText: 'You are not following any profiles or groups, yet.'
    }));

    // todo sort by date
    var component = x.makeComponent(async () => {
        var following = await library.getFollowing();
        var followingCount = following.length;
        if (followingCount > 0) {
            var profilesIDs = [];
            var groupsIDs = [];
            for (var typedPropertyID of following) {
                var propertyData = x.parseTypedID(typedPropertyID);
                if (propertyData.type === 'group') {
                    groupsIDs.push(propertyData.id);
                } else {
                    profilesIDs.push(propertyData.id);
                }
            }
            //var result = [];
            var list = x.makeList({ type: 'blocks' });
            if (profilesIDs.length > 0) {
                //result.push(x.makeSmallTitle('Profiles'));
                //var list = x.makeList({ type: 'blocks' });
                for (var userID of profilesIDs) {
                    list.add(await x.makeProfileButton('user', userID, { details: x.getShortID(userID) }));
                }
                //result.push(list);
            }
            if (groupsIDs.length > 0) {
                //result.push(x.makeSmallTitle('Groups'));
                //var list = x.makeList({ type: 'blocks' });
                for (var groupID of groupsIDs) {
                    list.add(await x.makeProfileButton('group', groupID, { details: 'group' }));
                }
                //result.push(list);
                component.observeChanges(['group/' + groupID + '/profile']);
            }
            x.setTemplate();
            return list;
        } else {
            x.setTemplate('empty');
            //return x.makeHint('There are no profiles and groups here');
            return null;
        }
    });
    component.observeChanges(['explore/following']);
    x.add(component);


};