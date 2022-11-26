/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    x.setTitle('Requests from groups');

    x.addToProfile(x.makeAppPreviewComponent('groups', {
        emptyTitle: 'Requests from groups',
        hint: 'Allow specific group members to send you connection requests.',
        emptyText: 'The groups you are part of will be visible here. There are none yet.'
    }));

    //x.add(x.makeText('Allow specific group members to send you connection requests.'));

    x.add(x.makeComponent(async () => {
        var list = x.makeList({ type: 'blocks' });
        var groups = await x.services.call('groups', 'getList', { details: ['allowConnectRequests'] });
        var itemsCount = 0;
        for (let groupID in groups) {
            var group = groups[groupID];
            list.add(await x.makeProfileButton('group', groupID, {
                onClick: (async groupID => {
                    x.open('contacts/connectSettingsGroup', { groupID: groupID }, { modal: true, width: 300 });
                }).bind(null, groupID),
                details: group.allowConnectRequests === 1 ? 'Allowed' : 'Forbidden'
            }));
            itemsCount++;
        }
        if (itemsCount === 0) {
            x.setTemplate('empty');
        } else {
            x.setTemplate();
        }
        return list;
    }, { observeChanges: ['groups/membersConnectStatus'] }));

};