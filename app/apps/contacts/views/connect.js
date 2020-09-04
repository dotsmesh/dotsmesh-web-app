/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var userID = args.id;
    var connectKey = args.connectKey !== undefined ? args.connectKey : null;
    if (x.currentUser.isPublic()) {
        x.setTitle('Connect');
    } else {
        x.setTitle('Add to contacts');
    }


    x.add(x.makeProfilePreviewComponent('user', userID, {
        theme: 'light',
        mode: 'simple'
    }));


    x.add(x.makeComponent(async () => {
        var contact = await library.get(userID);
        var request = await library.getRequest(userID);

        var text = null;
        var blocksToShow = [];
        if (contact !== null || request !== null) {
            if (contact !== null && contact.providedAccessKey !== null && contact.accessKey !== null) {
                text = 'Connected';
                blocksToShow.push('remove');
            } else if (contact !== null && contact.providedAccessKey !== null) {
                text = 'Connection request sent';
                blocksToShow.push('requestSent');
                blocksToShow.push('remove');
            } else if ((contact !== null && contact.accessKey !== null) || request !== null) {
                text = 'Approve connection request';
                blocksToShow.push('approveRequest');
                blocksToShow.push('denyRequest');
            } else {
                if (x.currentUser.isPublic()) {
                    blocksToShow.push('sendConnectRequest');
                }
                blocksToShow.push('remove');
            }
        } else {
            if (x.currentUser.isPublic()) {
                blocksToShow.push('sendConnectRequest');
            }
            blocksToShow.push('add');
        }

        var container = x.makeContainer();
        for (var i = 0; i < blocksToShow.length; i++) {
            var blockToShow = blocksToShow[i];
            if (blockToShow === 'remove') {
                container.add(x.makeButton('Remove from contacts', async () => {
                    x.showLoading();
                    await library.deleteRequest(userID);
                    await library.remove(userID);
                    await x.back();
                }));
            } else if (blockToShow === 'requestSent') {
                container.add(x.makeText('Connection request sent\n\n', true));
            } else if (blockToShow === 'denyRequest') {
                container.add(x.makeButton('Deny request', async () => {
                    x.showLoading();
                    await library.deleteRequest(userID);
                    await library.remove(userID);
                    await x.back();
                }));
            } else if (blockToShow === 'approveRequest') {
                container.add(x.makeButton('Approve connection request', async () => {
                    x.showLoading();
                    await library.approveRequest(userID);
                    await x.back();
                }));
            } else if (blockToShow === 'add') {
                container.add(x.makeButton(x.currentUser.isPublic() ? 'Just add to contacts' : 'Add to contacts', async () => {
                    x.showLoading();
                    await library.add(userID);
                    await x.back();
                }));
            } else if (blockToShow === 'sendConnectRequest') {
                container.add(x.makeButton('Send connection request', async () => {
                    x.showLoading();
                    var success = false;

                    // Try with connection key
                    if (connectKey !== null) {
                        var result = await library.sendRequest(userID, 'k/' + connectKey);
                        if (result) {
                            success = true;
                        }

                        // Try old format
                        if (!success) {
                            var result = await library.sendRequest(userID, connectKey);
                            if (result) {
                                success = true;
                            }
                        }
                    }

                    // Try open connect
                    if (!success) {
                        var result = await library.sendRequest(userID, 'o/c');
                        if (result) {
                            success = true;
                        }
                    }

                    // Try groups
                    if (!success) {
                        var groups = await x.services.call('groups', 'getList');
                        for (let groupID in groups) {
                            var isMember = await x.services.call('group', 'isMember', { groupID: groupID, typedID: userID });
                            if (isMember) {
                                var groupAccessKey = await x.services.call('groups', 'getMembersConnectAccessKey', { groupID: groupID });
                                var result = await library.sendRequest(userID, groupAccessKey);
                                if (result) {
                                    success = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (success) {
                        x.showMessage('Connection request sent!');
                    } else {
                        // Open connection key form
                        x.open('contacts/connectKey', { userID: userID }, { modal: true, width: 300 });
                    }

                    x.hideLoading();
                }));
            }
        }
        return container;
    }, { observeChanges: ['contacts'] }));

};