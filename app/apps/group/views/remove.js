/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var groupID = args.groupID;
    var userID = args.userID;

    x.setTemplate('modal-text');

    x.setTitle('Remove a member?');

    x.add(x.makeText('Are you sure, you want to remove this member from the group?', true));

    x.add(x.makeButton('Yes, remove!', async () => {
        x.showLoading();
        await library.removeMember(groupID, userID);
        await x.back('removed');
    }));

};