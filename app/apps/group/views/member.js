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
    var isCurrentUser = userID === currentUserID;

    x.setTemplate('columns-profile');

    var component = x.makeProfilePreviewComponent('groupMember', groupID + '$' + userID, {
        //userGroupMemberID: memberID,
        showEditButton: isCurrentUser && x.isPrivateID(currentUserID)
    });
    x.add(component, { template: 'column1' });

    var memberGroupDetails = await x.services.call('groups', 'getDetails', { groupID: groupID, details: ['administratorsKeys'] });
    var isAdministrator = memberGroupDetails !== null && memberGroupDetails.administratorsKeys !== null;

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
        x.add(component, { template: 'column1' });
    }

    x.add(x.makeTitle('Recent activity'), { template: 'column2' });

    x.add(x.makeHint('This feature is coming soon!'), { template: 'column2' });

    var component = x.makePostsListComponent(async options => {
        //console.table(await library.getMemberActivity(groupID, userID));
        return [];
    });
    //component.observeChanges(['user/' + userID + '/profile', 'user/' + userID + '/posts']);
    x.add(component, { template: 'column2' });

};