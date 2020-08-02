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
    x.add(x.makeComponent(async () => {
        let list = x.makeList();
        if (type === 'user') {
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
                }
            }
        } else if (type === 'group') {
            var groups = await x.services.call('groups', 'getList');
            for (let groupID in groups) {
                list.add(await x.makeProfileButton('group', groupID, {
                    onClick: (async groupID => {
                        if (await callService(groupID)) {
                            x.back({ id: groupID });
                        }
                    }).bind(null, groupID)
                }));
            }
        }
        return list;
    }));

};