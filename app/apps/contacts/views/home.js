/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTitle('Contacts');

    x.add(x.makeTitle('Contacts', {
        buttonOnClick: () => {
            x.open('contacts/form', {}, { modal: true, width: 300 });
        }
    }));

    x.add(x.makeComponent(async () => {
        var contacts = await library.getList();
        var list = x.makeList({ type: 'grid' });
        var itemsCount = 0;
        for (var i = 0; i < contacts.length; i++) {
            var contact = contacts[i];
            var userID = contact.id;
            // if (contact.providedAccessKey !== null && contact.accessKey !== null) {
            //     suffix = ' / Connected';
            // }
            // + ' / ' + contact.invitationSource
            list.add(await x.makeProfileButton('user', userID, { details: x.getShortID(userID) }));
            itemsCount++;
        }
        if (itemsCount === 0) {
            return x.makeHint('No added contacts. Find a contact by entering its ID and send a connection request.');
        }
        return list;
    }, { observeChanges: ['contacts'] }));

    if (x.currentUser.isPublic()) {

        x.addToolbarButton('Ways to connect', async () => {
            x.open('contacts/connectSettings', {}, { modal: true, width: 300 });
        }, 'settings');

        x.add(x.makeSmallTitle('Requests'));

        x.add(x.makeComponent(async () => {
            var requests = await library.getRequestsList();
            var list = x.makeList({ type: 'grid' });
            var itemsCount = 0;
            for (var i = 0; i < requests.length; i++) {
                var request = requests[i];
                var userID = request.userID;
                list.add(await x.makeProfileButton('user', userID, { details: x.getShortID(userID) }));
                itemsCount++;
            }
            if (itemsCount === 0) {
                return x.makeHint('No pending connection requests.');
            }
            return list;
        }, { observeChanges: ['contactsRequests'] }));

    }
};