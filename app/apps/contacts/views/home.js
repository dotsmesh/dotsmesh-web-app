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
    }
    ));

    // x.add(x.makeIconButton(() => {
    //     x.open('contacts/form', {}, { modal: true, width: 300 });
    // }, 'x-icon-plus-white', 'Add contact'));//, null, true

    var getContactsComponent = type => {
        return x.makeComponent(async () => {
            let contacts = await library.getList(); // ['name', 'connected', 'dateAdded', 'dateConnected'] todo ???
            let list = x.makeList({ type: 'grid' });
            var itemsCount = 0;
            for (var i = 0; i < contacts.length; i++) {
                var contact = contacts[i];
                var isRequest = contact.providedAccessKey === null && contact.accessKey !== null;
                if (type === 'approved' && !isRequest) {
                    // ok
                } else if (type === 'requests' && isRequest) {
                    // ok
                } else {
                    continue;
                }
                var userID = contact.id;
                var suffix = '';
                // if (contact.providedAccessKey !== null && contact.accessKey !== null) {
                //     suffix = ' / Connected';
                // }
                // + ' / ' + contact.invitationSource
                list.add(await x.makeProfileButton('user', userID, { details: x.getShortID(userID) + suffix }));
                itemsCount++;
            }
            if (itemsCount === 0) {
                return x.makeHint(type === 'approved' ? 'No added contacts. Find a contact by entering its ID and send a connect request.' : 'No pending contact requests.');
            }
            return list;
        }, {
            observeChanges: ['contacts']
        });
    };

    //x.add(x.makeSeparator());

    //x.add(x.makeSmallTitle('Recently added'));

    x.add(getContactsComponent('approved'));

    if (x.currentUser.isPublic()) {
        //x.add(x.makeSeparator());

        x.add(x.makeSmallTitle('Requests'));

        x.add(getContactsComponent('requests'));

        //x.add(x.makeSeparator());

        x.add(x.makeSmallTitle('Connect keys', {
            buttonOnClick: () => {
                x.open('contacts/connectKeyForm', {}, { modal: true, width: 300 });
            }
        }));
        // x.add(x.makeIconButton(() => {
        //     x.open('contacts/connectKeyForm', {}, { modal: true, width: 300 });
        // }, 'x-icon-plus-white', 'New key'));//, null, true
        x.add(x.makeComponent(async () => {
            let connectKeys = await library.getConnectKeysList();
            var connectKeysCount = connectKeys.length;
            if (connectKeysCount === 0) {
                return x.makeHint('Create a new key and share it with people you want to connect with. They will be able to see your profile and confirm the connection.');
            } else {
                let list = x.makeList({ type: 'grid' });
                for (var i = 0; i < connectKeysCount; i++) {
                    var connectKey = connectKeys[i];
                    list.add(await x.makeTextButton(((connectKey) => {
                        x.open('contacts/connectKeyForm', { key: connectKey.key }, { modal: true, width: 300 });
                    }).bind(null, connectKey), connectKey.name, connectKey.dateCreated));
                }
                return list;
            }
        }, {
            observeChanges: ['contactsConnectKeys']
        }));
    }
};