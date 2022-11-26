/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var groupID = args.groupID;
    var userID = args.userID;

    x.setTitle('Member profile');

    var memberData = await library.getMemberData(groupID, userID);
    if (memberData === null) {
        x.showMessage('Member not found!');
        return;
    }

    //var memberID = await library.getMemberID(groupID, userID);

    // var dataStorage = await x.group.getCurrentMemberSharedDataStorage(groupID);

    // var dataStorage = await x.group.getMemberSharedDataStorage(groupID, memberID);

    // console.log(await library.isMember(groupID, userID));
    // console.log(await library.getMemberData(groupID, userID));
    // console.log(await library.getMemberDetails(groupID, userID));

    var currentUserID = x.currentUser.getID();
    var isCurrentUser = x.currentUser.isMatch(userID);

    //x.setTemplate('columns');

    var component = x.makeProfilePreviewComponent('groupMember', groupID + '$' + userID, {
        //userGroupMemberID: memberID,
        showEditButton: isCurrentUser && x.isPrivateID(currentUserID)
    });
    x.addToProfile(component);

    var isAdministrator = await x.services.call('groups', 'isAdministrator', { groupID: groupID });
    if (isAdministrator && !isCurrentUser) {
        var component = x.makeSecretComponent('Administrators only', async component2 => {
            var memberData = await library.getMemberData(groupID, userID);
            if (memberData !== null) { // just removed
                if (memberData.status === 'pendingApproval') {
                    var button = x.makeButton('Approve or deny membership', async () => {
                        var result = await x.open('group/approve', { groupID: groupID, userID: userID }, { modal: true, width: 300 });
                        if (result === 'removed') {
                            x.showMessage('The membership request has been denied!');
                        }
                    });
                    component2.add(button);
                } else {
                    var button = x.makeButton('Remove from group', async () => {
                        var result = await x.open('group/remove', { groupID: groupID, userID: userID }, { modal: true, width: 300 });
                        if (result === 'removed') {
                            x.showMessage('The member has been removed!');
                        }
                    });
                    component2.add(button);
                }
            }
        });
        component.observeChanges(['group/' + groupID + '/members', 'group/' + groupID + '/member/' + userID, 'group/' + groupID + '/invitations']);
        x.addToProfile(component);
    }

    //x.add(x.makeTitle('Recent activity'));

    //x.add(x.makeHint('This feature is coming soon!'));

    x.setTemplate('empty');

    // var component = await x.makePostsListComponent(async options => {
    //     //console.table(await library.getMemberActivity(groupID, userID));
    //     return [];
    // });
    // //component.observeChanges(['user/' + userID + '/profile', 'user/' + userID + '/posts']);
    // x.add(component);

};