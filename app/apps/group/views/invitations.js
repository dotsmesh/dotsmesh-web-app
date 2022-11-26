/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var groupID = args.id;
    var title = 'Group invitations';
    x.setTitle(title);

    x.addToProfile(x.makeSmallProfilePreviewComponent('group', groupID, {
        emptyTitle: title,
        hint: 'Group invitations',
        emptyText: 'There are no personal pending invitations or invitation URLs!'
    }));

    // todo check if admin
    x.addToolbarSecretButton('This list is visible only to the group administrators!');

    //x.add(x.makeSmallTitle('Personal'));

    x.add(x.makeComponent(async () => {
        var container = x.makeContainer();
        var invitations = await library.getInvitationsList(groupID); // todo optimize because there are two requests
        var addedCount = 0;
        let list = x.makeList({ type: 'blocks' });
        for (var i = 0; i < invitations.length; i++) {
            var invitation = invitations[i];
            if (invitation.type === 'personalInvitation') {
                var userID = invitation.userID;
                list.add(await x.makeProfileButton('user', userID, {
                    onClick: (invitationID => {
                        x.open('group/invitationDetails', { groupID: groupID, invitationID: invitationID }, { modal: true, width: 300 });
                    }).bind(null, invitation.id)
                }));
                addedCount++;
            } else if (invitation.type === 'urlInvitation') {
                list.add(await x.makeIconButton((invitationID => {
                    x.open('group/invitationDetails', { groupID: groupID, invitationID: invitationID }, { modal: true, width: 300 });
                }).bind(null, invitation.id), 'key', 'Created by ' + x.getShortID(invitation.createdBy), {
                    details: x.getHumanDate(invitation.dateCreated),
                    imageSize: 50
                }));
                addedCount++;
            }
        }
        if (addedCount > 0) {
            x.setTemplate();
            container.add(list);
        } else {
            x.setTemplate('empty');
            return null;
        }
        return container;
    }, {
        observeChanges: ['group/' + groupID + '/invitations']
    }));

    //x.add(x.makeSmallTitle('Invitation URLs'));

    // x.add(x.makeComponent(async () => {
    //     var container = x.makeContainer();
    //     var invitations = await library.getInvitationsList(groupID); // todo optimize because there are two requests
    //     var addedCount = 0;
    //     let list = x.makeList({ type: 'grid' });
    //     for (var i = 0; i < invitations.length; i++) {
    //         var invitation = invitations[i];
    //         if (invitation.type === 'urlInvitation') {
    //             list.add(await x.makeIconButton((invitationID => {
    //                 x.open('group/invitationDetails', { groupID: groupID, invitationID: invitationID }, { modal: true, width: 300 });
    //             }).bind(null, invitation.id), 'key', 'Created by ' + x.getShortID(invitation.createdBy), {
    //                 details: x.getHumanDate(invitation.dateCreated),
    //                 imageSize: 50
    //             }));
    //             addedCount++;
    //         }
    //     }
    //     if (addedCount > 0) {
    //         container.add(list);
    //     } else {
    //         container.add(x.makeHint('There are no active invitation URLs!'));
    //     }
    //     return container;
    // }, {
    //     observeChanges: ['group/' + groupID + '/invitations']
    // }));

};