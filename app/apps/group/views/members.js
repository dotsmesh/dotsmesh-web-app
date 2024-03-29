/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var groupID = args.id;
    var mode = args.mode !== undefined ? args.mode : 'members';
    var isMembersMode = mode === 'members';
    var title = isMembersMode ? 'Group members' : 'Pending approval';
    x.setTitle(title);
    //x.add(x.makeTitle(title));

    x.addToProfile(x.makeSmallProfilePreviewComponent('group', groupID, {
        emptyTitle: title,
        hint: title,
        emptyText: 'No new members are waiting to be approved'
    }));

    if (!isMembersMode) {
        // todo check if admin
        x.addToolbarSecretButton('This list is visible only to the group administrators!');
    }

    var lastSeen = [];
    var listComponent = x.makeComponent(async () => {
        lastSeen = [];
        var container = x.makeContainer();
        if (mode === 'members') {
            var members = await library.getMembersList(groupID);
        } else if (mode === 'pendingApproval') {
            var members = await library.getPendingMembersList(groupID);
        }
        if (members.length === 0) {
            if (!isMembersMode) {
                x.setTemplate('empty');
                return null;
            }
        } else {
            let list = x.makeList({ type: 'blocks' });
            for (var i = 0; i < members.length; i++) {
                var member = members[i];
                var userID = member.userID;
                list.add(await x.makeProfileButton('groupMember', groupID + '$' + userID, {
                    details: x.isPublicID(userID) ? x.getShortID(userID) : 'private profile',
                    onClick: { location: 'group/member', args: { groupID: groupID, userID: userID }, preload: true }
                }));
                lastSeen.push(userID);
                listComponent.observeChanges(['groupMember/' + groupID + '$' + userID + '/profile']);
            }
            container.add(list);
        }
        x.setTemplate();
        return container;
    }, {
        observeChanges: ['group/' + groupID + '/members']
    });

    x.add(listComponent);

    if (!isMembersMode) {
        x.addToolbarNotificationsButton('gmp$' + groupID, action => {
            return {
                appID: 'group',
                name: 'modifyPendingMembersNotification',
                args: { action: action, groupID: groupID, lastSeenUsersIDs: lastSeen }
            }
        }, 'Get notified when a new member is pending approval.', 'You\'ll receive a notification when a new member is pending approval.');
        x.windowEvents.addEventListener('show', async () => {
            await library.updatePendingMembersNotification(groupID, { lastSeenUsersIDs: lastSeen });
        });
    }

};