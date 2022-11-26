/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var groupID = args.id;

    x.setTitle('Group membership');

    var showJoinButton = false;
    var showLeaveButton = false;

    x.add(x.makeProfilePreviewComponent('group', groupID, {
        theme: 'light',
        size: 'medium'
    }));

    var details = await x.services.call('groups', 'getDetails', { groupID: groupID, details: ['status', 'invitedBy'] });
    let status = details.status;
    if (status === 'joined') {
        x.add(x.makeText('You are currently a member of this group!', { align: 'center' }));
        showLeaveButton = true;
    } else if (status === 'pendingApproval') {
        x.add(x.makeText('Your membership must be approved by an administrator!', { align: 'center' }));
        showLeaveButton = true;
    } else {
        x.add(x.makeText('Welcome to the group! You can look around, but you cannot post or comment until joined!', { align: 'center' }));
        showJoinButton = true;
        showLeaveButton = true;
    }

    var container = x.makeContainer();
    if (showJoinButton) {
        container.add(x.makeButton('Join', async () => {
            var userID = x.currentUser.getID();
            if (x.currentUser.isPublic()) {
                if (await x.confirm('Are you sure you want to join this group?')) {
                    x.showLoading();
                    await x.services.call('groups', 'join', { groupID: groupID });
                    await x.back('joined');
                }
            } else {
                x.showLoading();
                var data = await x.services.call('profile', 'getData', { propertyType: 'user', propertyID: userID });
                x.hideLoading();
                var result = await x.open('profile/form', {
                    groupUserID: groupID + '$' + userID,
                    image: data.image,
                    name: data.name,
                    description: data.description,
                    title: 'Customize your profile',
                    buttonText: 'Save and join group',
                    callServiceBefore: {
                        appID: 'groups',
                        name: 'join',
                        args: { groupID: groupID }
                    }
                }, { modal: true, width: 300 });
                await x.back(result === 'saved' ? 'joined' : null);
            }
        }, { marginTop: 'big' }));
    }
    if (showLeaveButton) {
        container.add(x.makeButton('Leave group', async () => {
            if (await x.confirm('Are you sure you want to leave this group?')) {
                x.showLoading();
                await x.services.call('groups', 'leave', { groupID: groupID });
                await x.back('left');
            }
        }, { marginTop: showJoinButton ? null : 'big' }));
    }
    x.add(container);

};