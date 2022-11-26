/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var title = 'Contacts';
    x.setTitle(title);
    //x.setTemplate('column');

    // x.add(x.makeTitle('Contacts', {
    //     buttonOnClick: () => {
    //         x.open('contacts/form', {}, { modal: true, width: 300 });
    //     }
    // }));

    x.addToProfile(x.makeAppPreviewComponent('contacts', {
        emptyTitle: title,
        emptyText: 'Find a contact by entering its ID and send a connection request.', // todo for private profiles
        actionButton: async () => {
            return {
                onClick: async () => {
                    x.open('contacts/form', {}, { modal: true, width: 300 });
                },
                text: 'New contact'
            }
        },
    }));

    // var container = x.makeContainer({ addSpacing: true});
    // container.add(x.makeButton('New contact', () => {
    //     x.open('contacts/form', {}, { modal: true, width: 300 });
    // }, { style: 'style2', icon: 'plus' }));
    // x.add(container);

    // x.add(x.makeButton('New contact', () => {
    //     x.open('contacts/form', {}, { modal: true, width: 300 });
    // }, { style: 'style2' }));

    //x.add(x.makeSmallTitle('Connected'));

    x.add(x.makeComponent(async () => {
        var contacts = await library.getList();
        var list = x.makeList({ type: 'blocks' });
        var itemsCount = 0;

        if (x.currentUser.isPublic()) {
            var requests = await library.getRequestsList();
            for (var i = 0; i < requests.length; i++) {
                var request = requests[i];
                var userID = request.userID;
                list.add(await x.makeProfileButton('user', userID, { details: x.getShortID(userID) }));
                itemsCount++;
            }
        }

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
            x.setTemplate('empty');
            //return x.makeHint('No added contacts. Find a contact by entering its ID and send a connection request.');
        } else {
            x.setTemplate();
        }
        return list;
    }, { observeChanges: ['contacts', 'contactsRequests'] }));

    if (x.currentUser.isPublic()) {

        x.addToolbarButton('Ways to connect', async () => {
            x.open('contacts/connectSettings');
        }, 'settings');

        // x.add(x.makeSmallTitle('Requests'));

        // x.add(x.makeComponent(async () => {
        //     var requests = await library.getRequestsList();
        //     var list = x.makeList({ type: 'blocks' });
        //     var itemsCount = 0;
        //     for (var i = 0; i < requests.length; i++) {
        //         var request = requests[i];
        //         var userID = request.userID;
        //         list.add(await x.makeProfileButton('user', userID, { details: x.getShortID(userID) }));
        //         itemsCount++;
        //     }
        //     if (itemsCount === 0) {
        //         return x.makeHint('No pending connection requests.');
        //     }
        //     return list;
        // }, { observeChanges: ['contactsRequests'] }));

    }
};