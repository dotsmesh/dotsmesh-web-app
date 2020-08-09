/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var groupID = args.groupID;
    var userID = args.userID;
    x.setTitle('Approve or deny membership');

    x.add(x.makeText(''));

    var container = x.makeContainer();

    container.add(x.makeButton('Approve', async () => {
        if (await x.confirm('Are you sure you want to add this person to the group?')) {
            x.showLoading();
            await library.approveMember(groupID, userID);
            await x.back('approved');
        }
    }));

    container.add(x.makeButton('Deny', async () => {
        if (await x.confirm('Are you sure you want to remove this person from the group?')) {
            x.showLoading();
            await library.removeMember(groupID, userID);
            await x.back('removed');
        }
    }));

    x.add(container);

};