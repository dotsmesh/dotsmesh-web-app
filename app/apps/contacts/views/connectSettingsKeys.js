/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    x.setTitle('Connection keys');

    x.add(x.makeText('Create a new key and share it with the people you want to connect with. They will be able to send you connection requests.'));

    x.add(x.makeComponent(async () => {
        let connectKeys = await library.getConnectKeysList();
        var list = x.makeList();
        for (var connectKey of connectKeys) {
            list.add(await x.makeTextButton(((connectKey) => {
                x.open('contacts/connectSettingsKey', { key: connectKey.key }, { modal: true, width: 300 });
            }).bind(null, connectKey), connectKey.key));
        }
        return list;
    }, { observeChanges: ['contactsConnectKeys'] }));

    x.add(x.makeTextButton(async () => {
        x.open('contacts/connectSettingsKey', {}, { modal: true, width: 300 });
    }, 'Create key'));

};