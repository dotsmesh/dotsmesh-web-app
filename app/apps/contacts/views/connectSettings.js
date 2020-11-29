/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    x.setTitle('Ways to connect');

    x.add(x.makeText('Precisely configure the ways other people send you connection requests.'));

    x.add(x.makeComponent(async () => {

        var anonymousConnectIsAllowed = await library.getOpenConnectStatus();
        var list = x.makeList();
        list.add(x.makeIconButton(async () => {
            x.open('contacts/connectSettingsOpenConnect', {}, { modal: true, width: 300 });
        }, 'globe', 'Requests from everyone', {
            details: (anonymousConnectIsAllowed ? 'Allowed' : 'Forbidden'),
            imageSize: 50
        }));

        var enabledGroupCount = 0;
        var totalGroupCount = 0;
        var groups = await x.services.call('groups', 'getList', { details: ['allowConnectRequests'] });
        for (let groupID in groups) {
            var group = groups[groupID];
            if (group.allowConnectRequests === 1) {
                enabledGroupCount++;
            }
            totalGroupCount++;
        }
        list.add(x.makeIconButton(async () => {
            x.open('contacts/connectSettingsGroups', {}, { modal: true, width: 300 });
        }, 'group', 'Requests from groups', {
            details: 'Allowed for ' + enabledGroupCount + '/' + totalGroupCount + ' groups',
            imageSize: 50
        }));

        var connectKeys = await library.getConnectKeysList();
        var connectKeysCount = connectKeys.length;
        list.add(x.makeIconButton(async () => {
            x.open('contacts/connectSettingsKeys', {}, { modal: true, width: 300 });
        }, 'key', 'Connection keys', {
            details: connectKeysCount + ' active',
            imageSize: 50
        }));

        return list;
    }, { observeChanges: ['contactsOpenStatus', 'contactsConnectKeys', 'groups/membersConnectStatus'] }));

};