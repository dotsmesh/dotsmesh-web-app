/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    if (args.type === 'gi') {
        var data = x.unpack(args.data);
        if (data.name === 'i') {
            data = data.value;
            var groupID = data.g; // validate
            var userID = data.u; // validate
            var details = {};
            details.invitedBy = userID;
            details.memberAccessKey = data.a; // validate
            details.membersKeys = data.k; // validate
            details.membersIDSalt = data.s; // validate
            try {
                await library.addInvitation(groupID, details);
                var userProfile = await x.user.getProfile(userID);
                var groupProfile = await x.group.getProfile(groupID);

                var notification = await x.notifications.make();
                notification.visible = true;
                notification.title = 'Invitation from ' + userProfile.name;
                notification.text = 'You are invited to join the private group ' + groupProfile.name;
                notification.image = { type: 'userProfile', id: userID };
                notification.onClick = { location: 'group/home', args: { id: groupID } };
                notification.deleteOnClick = true;
                notification.tags = ['g'];
                await x.notifications.set(notification);

            } catch (e) {
                // access key may be valid no more
            }
        }
    }
}