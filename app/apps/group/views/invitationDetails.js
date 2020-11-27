/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var groupID = args.groupID;
    var invitationID = args.invitationID;
    x.setTitle('Invitation');

    var invitation = await library.getInvitation(groupID, invitationID);
    if (invitation === null) {
        throw new Error();
    }

    var deleteButtonText = '';
    var deleteConfirmText = '';
    if (invitation.type === 'personalInvitation') {
        var list = x.makeList();
        var userID = invitation.userID;
        list.add(await x.makeProfileButton('user', userID));
        list.add(x.makeSmallTitle('Invited by'));
        list.add(await x.makeProfileButton('groupMember', groupID + '$' + invitation.invitedBy, {
            onClick: { location: 'group/member', args: { groupID: groupID, userID: invitation.invitedBy }, preload: true }
        }));
        list.add(x.makeSmallTitle('Date invited'));
        list.add(x.makeText(x.getHumanDate(invitation.dateInvited)));
        x.add(list);
        deleteButtonText = 'Delete invitation';
        deleteConfirmText = 'Are you sure you want to delete this personal invitation?';
    } else if (invitation.type === 'urlInvitation') {
        var list = x.makeList();
        list.add(x.makeSmallTitle('Created by'));
        list.add(await x.makeProfileButton('groupMember', groupID + '$' + invitation.createdBy, {
            onClick: { location: 'group/member', args: { groupID: groupID, userID: invitation.createdBy }, preload: true }
        }));
        list.add(x.makeSmallTitle('Date created'));
        list.add(x.makeText(x.getHumanDate(invitation.dateCreated)));
        x.add(list);
        deleteButtonText = 'Delete URL';
        deleteConfirmText = 'Are you sure you want to delete this invitation URL?';
    } else {
        throw new Error();
    }

    x.add(x.makeButton(deleteButtonText, async () => {
        if (await x.confirm(deleteConfirmText)) {
            x.showLoading();
            await x.services.call('group', 'deleteInvitation', { groupID: groupID, invitationID: invitationID });
            await x.back();
        }
    }));

};