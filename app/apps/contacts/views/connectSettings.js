/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var title = 'Ways to connect';
    x.setTitle(title);

    x.addToProfile(x.makeAppPreviewComponent('contacts', {
        //title: title,
        hint: 'Precisely configure the ways other people send you connection requests.'
    }));

    //x.add(x.makeHint('Precisely configure the ways other people send you connection requests.'));

    x.add(x.makeComponent(async () => {

        var anonymousConnectIsAllowed = await library.getOpenConnectStatus();
        var list = x.makeList({ type: 'blocks' });

        list.add(x.makeTextButton(async () => {
            x.open('contacts/connectSettingsOpenConnect', {}, { modal: true, width: 300 });
        }, 'Requests from everyone', {
            details: (anonymousConnectIsAllowed ? 'Allowed' : 'Forbidden')
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
        list.add(x.makeTextButton(async () => {
            x.open('contacts/connectSettingsGroups');
        }, 'Requests from groups', {
            details: 'Allowed for ' + enabledGroupCount + ' of ' + totalGroupCount + ' ' + (enabledGroupCount === 1 ? 'group' : 'groups')
        }));

        var connectKeys = await library.getConnectKeysList();
        var connectKeysCount = connectKeys.length;
        list.add(x.makeTextButton(async () => {
            x.open('contacts/connectSettingsKeys');
        }, 'Connection keys', {
            details: connectKeysCount + ' active ' + (connectKeysCount === 1 ? 'key' : 'keys')
        }));

        return list;
    }, { observeChanges: ['contactsOpenStatus', 'contactsConnectKeys', 'groups/membersConnectStatus'] }));

};