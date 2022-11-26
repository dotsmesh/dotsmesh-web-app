/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var groupID = args.groupID;
    var userID = args.userID;

    x.setTitle('Remove member');

    x.add(x.makeProfilePreviewComponent('groupMember', groupID + '$' + userID, {
        theme: 'light',
        size: 'medium'
    }));

    x.add(x.makeText('Are you sure, you want to remove this member from the group?', { align: 'center' }));

    x.add(x.makeButton('Yes, remove', async () => {
        x.showLoading();
        await library.removeMember(groupID, userID);
        await x.back('removed');
    }, { marginTop: 'big' }));

};