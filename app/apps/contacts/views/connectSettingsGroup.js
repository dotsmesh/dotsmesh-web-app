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
        mode: 'simple',
        imageSize: 150
    }));

    var allowed = await x.services.call('groups', 'getMembersConnectStatus', { groupID: groupID });
    if (allowed) {
        x.add(x.makeText('Group members are allowed to send you connection requests.', true));
        x.add(x.makeButton('Disable', async () => {
            x.showLoading();
            await x.services.call('groups', 'setMembersConnectStatus', { groupID: groupID, allow: false })
            await x.back();
        }));
    } else {
        x.add(x.makeText('Connection requests from this group\'s members are forbidden.', true));
        x.add(x.makeButton('Allow', async () => {
            x.showLoading();
            await x.services.call('groups', 'setMembersConnectStatus', { groupID: groupID, allow: true })
            await x.back();
        }));
    }

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