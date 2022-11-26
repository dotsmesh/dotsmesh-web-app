/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    var groupID = args.groupID;

    x.setTitle('Group connection requests');

    x.add(x.makeProfilePreviewComponent('group', groupID, {
        theme: 'light',
        size: 'medium'
    }));

    var allowed = await x.services.call('groups', 'getMembersConnectStatus', { groupID: groupID });
    x.add(x.makeText(allowed ? 'Group members are allowed to send you connection requests.' : 'Connection requests from this group\'s members are forbidden.', { align: 'center' }));
    x.add(x.makeButton(allowed ? 'Disable' : 'Allow', async () => {
        x.showLoading();
        await x.services.call('groups', 'setMembersConnectStatus', { groupID: groupID, allow: !allowed })
        await x.back();
    }, { marginTop: 'big' }));

    //var group = await x.group.getProfile(groupID);

    // x.add(x.makeText('When allowed, every member of ' + group.name + ' will be able to send you connection requests.'));

    // var allowed = await x.services.call('groups', 'getMembersConnectStatus', { groupID: groupID });

    // var fieldAllow = x.makeFieldCheckbox('Allow');
    // x.add(fieldAllow);
    // fieldAllow.setChecked(allowed);

    // x.add(x.makeButton('Save changes', async () => {
    //     x.showLoading();
    //     await x.services.call('groups', 'setMembersConnectStatus', { groupID: groupID, allow: fieldAllow.isChecked() })
    //     await x.back();
    // }));

};