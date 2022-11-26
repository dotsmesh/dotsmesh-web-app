/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    x.setTitle('Connection keys');

    x.addToProfile(x.makeAppPreviewComponent('key', {
        emptyTitle: 'Connection keys',
        hint: 'Create connection keys and share them with the people you want to connect with. They will be able to send you connection requests.',
        emptyText: 'Create connection keys and share them with the people you want to connect with. They will be able to send you connection requests.',
        actionButton: async () => {
            return {
                onClick: async () => {
                    x.open('contacts/connectSettingsKey', {}, { modal: true, width: 300 });
                },
                text: 'New key'
            }
        },
    }));

    //x.add(x.makeText('Create a new key and share it with the people you want to connect with. They will be able to send you connection requests.'));

    x.add(x.makeComponent(async () => {
        let connectKeys = await library.getConnectKeysList();
        var list = x.makeList({ type: 'blocks' });
        var itemsCount = 0;
        for (var connectKey of connectKeys) {
            list.add(await x.makeTextButton(((connectKey) => {
                x.open('contacts/connectSettingsKey', { key: connectKey.key }, { modal: true, width: 300 });
            }).bind(null, connectKey), connectKey.key.toUpperCase(), {
                details: x.getHumanDate(x.parseDateID(connectKey.dateCreated))
            }));
            itemsCount++;
        }
        if (itemsCount === 0) {
            x.setTemplate('empty');
        } else {
            x.setTemplate();
        }
        return list;
    }, { observeChanges: ['contactsConnectKeys'] }));

    // x.add(x.makeTextButton(async () => {
    //     x.open('contacts/connectSettingsKey', {}, { modal: true, width: 300 });
    // }, 'Create key'));

};