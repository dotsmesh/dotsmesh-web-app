/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    x.setTitle('Requests from groups');

    x.add(x.makeText('Allow specific group members to send you connection requests.'));

    x.add(x.makeComponent(async () => {

        var list = x.makeList();
        var groups = await x.services.call('groups', 'getList', { details: ['allowConnectRequests'] });
        for (let groupID in groups) {
            var group = groups[groupID];
            list.add(await x.makeProfileButton('group', groupID, {
                onClick: (async groupID => {
                    x.open('contacts/connectSettingsGroup', { groupID: groupID }, { modal: true, width: 300 });
                }).bind(null, groupID),
                details: group.allowConnectRequests === 1 ? 'Connection requests allowed' : 'Connection requests forbidden'
            }));
        }

        return list;
    }, { observeChanges: ['groups/membersConnectStatus'] }));

};