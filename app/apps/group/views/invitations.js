/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var groupID = args.id;
    var title = 'Group invitations';
    x.setTitle(title);
    x.add(x.makeTitle(title));

    // tdoto check if admin
    x.addToolbarSecretButton('This list is visible only to the group administrators!');

    x.add(x.makeComponent(async () => {
        var container = x.makeContainer();
        container.add(x.makeHint('This feature is coming soon!'));
        // var invitations = await library.getInvitationsList(groupID);
        // if (invitations.length === 0) {
        //     container.add(x.makeHint('There are no active invitations in this group!'));
        // } else {
        //     console.log(invitations);
        //     let list = x.makeList({ type: 'grid' });
        //     for (var i = 0; i < invitations.length; i++) {
        //         // var member = members[i];
        //         // var userID = member.userID;
        //         // list.add(await x.makeProfileButton('user', userID, {
        //         //     text: x.getShortID(userID),
        //         //     onClick: { location: 'group/member', args: { groupID: groupID, userID: userID }, preload: true }
        //         // }));
        //     }
        //     container.add(list);
        // }
        return container;
    }, {
        observeChanges: ['group/' + groupID + '/invitations']
    }));

};