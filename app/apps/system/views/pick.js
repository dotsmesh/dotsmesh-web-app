/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    var type = args.type;
    var options = args.options !== undefined ? args.options : {};

    var callService = async pickedID => {
        if (options.service !== undefined) {
            x.showLoading();
            var service = options.service;
            var args = service.args;
            args.pickedID = pickedID;
            var result = await x.services.call(service.appID, service.name, args);
            x.hideLoading();
            if (result.text !== undefined) {
                x.showMessage(result.text, {
                    buttonText: 'OK',
                    buttonClick: () => {
                        x.back(result, { closeAllModals: options.closeAllModals !== undefined && options.closeAllModals });
                    }
                });
                return false;
            }
        }
        return true;
    };

    if (type === 'user') {
        x.setTitle('Pick a contact');
    } else if (type === 'group') {
        x.setTitle('Pick a group');
    }

    var list = x.makeList();
    var addedItemsCount = 0;
    var emptyText = '';
    if (type === 'user') {
        emptyText = 'There are no contacts to show!';
        var contacts = await x.services.call('contacts', 'getList', { details: ['name'] }); // todo just id is needed
        for (let i in contacts) {
            var contact = contacts[i];
            if (contact.providedAccessKey !== null && contact.accessKey !== null) {
                var userID = contact.id;
                list.add(await x.makeProfileButton('user', userID, {
                    onClick: (async userID => {
                        if (await callService(userID)) {
                            x.back({ id: userID });
                        }
                    }).bind(null, userID)
                }));
                addedItemsCount++;
            }
        }
    } else if (type === 'group') {
        emptyText = 'There are no groups to show!';
        var groups = await x.services.call('groups', 'getList');
        for (let groupID in groups) {
            list.add(await x.makeProfileButton('group', groupID, {
                onClick: (async groupID => {
                    if (await callService(groupID)) {
                        x.back({ id: groupID });
                    }
                }).bind(null, groupID)
            }));
            addedItemsCount++;
        }
    }
    if (addedItemsCount > 0) {
        x.add(list);
    } else {
        x.setTemplate('modal-text');
        x.add(x.makeText(emptyText, true));
        x.add(x.makeButton('OK', async () => {
            await x.back();
        }));
    }

};