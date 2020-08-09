/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var typedID = args.id;
    var connectKey = typeof args.connectKey !== 'undefined' ? args.connectKey : null;
    if (x.currentUser.isPublic()) {
        x.setTitle('Connect');
    } else {
        x.setTitle('Add to contacts');
    }

    var contact = await library.get(typedID);

    var attachment = x.attachment.make();
    attachment.type = 'u';
    attachment.value = { i: typedID };
    x.add(x.makeAttachmentPreviewComponent(attachment));

    var text = null;
    var blocksToShow = [];
    if (contact !== null) {
        if (contact.providedAccessKey !== null && contact.accessKey !== null) {
            text = 'Connected';
            blocksToShow.push('remove');
        } else if (contact.providedAccessKey !== null) {
            text = 'Connect request sent';
            blocksToShow.push('cancelRequest');
            blocksToShow.push('remove');
        } else if (contact.accessKey !== null) {
            text = 'Approve connect request';
            blocksToShow.push('approveRequest');
            blocksToShow.push('remove');
        } else {
            if (x.currentUser.isPublic()) {
                blocksToShow.push('connectForm');
            }
            blocksToShow.push('remove');
        }
    } else {
        if (x.currentUser.isPublic()) {
            blocksToShow.push('connectForm');
        }
        blocksToShow.push('add');
    }

    var container = x.makeContainer();
    for (var i = 0; i < blocksToShow.length; i++) {
        var blockToShow = blocksToShow[i];
        if (blockToShow === 'remove') {
            container.add(x.makeButton('Remove from contacts', async () => {
                x.showLoading();
                await library.remove(typedID);
                //await x.backPrepare();
                await x.back();
            }));
        } else if (blockToShow === 'cancelRequest') {
            container.add(x.makeButton('Cancel request', async () => {
                x.showLoading();
                await library.cancelRequest(typedID);
                //await x.backPrepare();
                await x.back();
            }));
        } else if (blockToShow === 'approveRequest') {
            container.add(x.makeButton('Approve connect request', async () => {
                x.showLoading();
                await library.approveRequest(typedID);
                //await x.backPrepare();
                await x.back();
            }));
        } else if (blockToShow === 'add') {
            container.add(x.makeButton(x.currentUser.isPublic() ? 'Just add to contacts' : 'Add to contacts', async () => {
                x.showLoading();
                await library.add(typedID);
                //await x.backPrepare();
                await x.back();
            }));
        } else if (blockToShow === 'connectForm') {
            // var groupAccessKey = null;
            // var groups = await x.services.call('groups', 'getList');
            // for (let groupID in groups) {
            //     var isMember = await x.services.call('group', 'isMember', { groupID: groupID, typedID: typedID });
            //     if (isMember) {
            //         var memberDetails = await x.services.call('group', 'getMemberDetails', { groupID: groupID, typedID: typedID });
            //         if (memberDetails === null) { // check if needed
            //             continue;
            //         }
            //         if (memberDetails.providedAccessKey !== null) {
            //             groupAccessKey = memberDetails.providedAccessKey;
            //             break;
            //         }
            //     }
            // }
            // if (groupAccessKey !== null) {
            //     //x.addText('You are both members of a group! TODO')
            //     container.add(x.makeButton('Send connect request', async () => {
            //         x.showLoading();
            //         if (await library.get(typedID) === null) {
            //             await library.add(typedID);
            //         }
            //         var result = await library.sendRequest(typedID, groupAccessKey);
            //         x.hideLoading();
            //         if (result === true) {
            //             x.showMessage('Connect request sent!');
            //         } else {
            //             x.showMessage('Sorry! Cannot connect now!');
            //         }
            //     }));
            // } else {
            var container2 = x.makeContainer(true);
            var fieldKey = x.makeFieldTextbox(null, { placeholder: 'Connect key' });
            if (connectKey !== null) {
                fieldKey.setValue(connectKey);
            }
            container2.add(fieldKey);
            container2.add(x.makeButton('Send request', async () => {
                x.showLoading();
                var key = fieldKey.getValue();
                if (await library.get(typedID) === null) {
                    await library.add(typedID);
                }
                var parsedTypedID = x.parseTypedID(typedID);
                if (key.indexOf(parsedTypedID.id + '/') === 0) {
                    key = key.substr(parsedTypedID.id.length + 1);
                }
                var result = await library.sendRequest(typedID, key);
                x.hideLoading();
                if (result === true) {
                    x.showMessage('Connect request sent!');
                } else {
                    x.showMessage('Sorry! The connect key is not valid!');
                }
            }));
            container.add(container2);
            //}
        }
    }
    x.add(container);

};