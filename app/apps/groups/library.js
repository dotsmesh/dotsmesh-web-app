() => {
    var groupsDataStorage = null;
    var getDetailsStorage = () => {
        if (groupsDataStorage === null) {
            groupsDataStorage = x.currentUser.getDataStorage('p/g/').getDetailsContext('l-', x.currentUser.isPublic() ? x.cache.get('groups-dc') : null);
        }
        return groupsDataStorage;
    };

    var detailsMap = {
        memberAccessKey: 'a',
        administratorsKeys: 'q',
        membersKeys: 'e',
        membersIDSalt: 's',
        status: 'j',
        date: 'd',
        invitedBy: 'u',
        //providedAccessKey: 'b'
    };

    var createGroup = async (groupKey) => {

        // todo
        var host = x.getPropertyKeyHost(x.getPropertyFullKey(groupKey));
        if (host === null) {
            throw x.makeAppError('invalidGroupKey', 'invalidGroupKey!');
        }

        // validate id - da pochva s host-a
        var currentUserID = x.currentUser.getID();

        var administratorsKeyBox = x.keyBox.make();
        var membersKeyBox = x.keyBox.make();
        var administratorsKey = await x.crypto.generateSymmetricKey('AES-GCM-256');
        administratorsKeyBox.add(administratorsKey);
        var membersKey = await x.crypto.generateSymmetricKey('AES-GCM-256');
        membersKeyBox.add(membersKey);
        var membersIDSalt = await x.generateRandomString(50, true);
        var memberAccessKey = await x.generateRandomString(50, true);
        //var groupAccessKey = await x.generateRandomString(50, true);

        var memberID = await x.groups.generateMemberID(currentUserID, membersIDSalt);

        var memberData = await x.cryptoData.encrypt(x.pack('', {
            i: currentUserID
        }), membersKeyBox);

        // var sharedGroupAccessKey = await x.cryptoData.encrypt(x.pack('', {
        //     a: groupAccessKey
        // }), membersKeyBox);

        var groupID = await x.group.create(host, {
            groupKey: groupKey,
            memberData: memberData,
            //sharedData: { 'g': sharedGroupAccessKey },
            memberID: memberID,
            accessKey: await x.getHash('SHA-512', await x.getHash('SHA-512', memberAccessKey))
        });
        var details = {
            memberAccessKey: memberAccessKey,
            //groupAccessKey: groupAccessKey,
            administratorsKeys: administratorsKeyBox.getValue(),
            membersKeys: membersKeyBox.getValue(),
            membersIDSalt: membersIDSalt,
            status: 1
        };
        await setGroupDetails(groupID, details);
        await x.property.observeChanges(groupID, ['gp', 'gp/*', 'gm', 'gma', 'gmp', 'gi', 'gm/' + memberID + '/s'], 'g');
        await x.services.call('group', 'modifyPendingMembersNotification', { action: 'add', groupID: groupID, lastSeenUsersIDs: [] });
        return groupID;
    };

    var invite = async (groupID, userID) => {
        // todo if in contacts and connected
        // todo add current user crypto signature
        var currentUserID = x.currentUser.getID();

        var secrets = await get(groupID, ['membersKeys', 'membersIDSalt']);
        var membersKeys = secrets.membersKeys;
        var membersIDSalt = secrets.membersIDSalt;

        var memberID = await x.groups.generateMemberID(userID, membersIDSalt);

        var dataStorage = await x.group.getSharedDataStorage(groupID);
        if (await dataStorage.exists('m/a/' + memberID + '/a')) {
            return 'alreadyMember';
        }
        if (await dataStorage.exists('m/p/' + memberID + '/a')) {
            return 'alreadyInvited';
        }

        var accessKey = await x.generateRandomString(50, true);

        var memberData = await x.cryptoData.encrypt(x.pack('', {
            i: userID, // id
            d: x.getDateID(Date.now()), // date invited
            w: currentUserID // invite by
        }), x.keyBox.make(membersKeys));

        var invitationData = x.pack('0', { // 0 - specific user
            i: memberID,
            m: memberData
        });

        var response = await x.group.call(groupID, 'group.invitations.add', {
            data: invitationData,
            accessKey: await x.getHash('SHA-512', await x.getHash('SHA-512', accessKey))
        }, { auth: 'auto' });
        var status = response.status;
        if (status === 'ok') {
            try {
                await x.user.send('gi', userID, x.pack('i', {
                    g: groupID,
                    u: currentUserID,
                    a: accessKey,
                    k: membersKeys,
                    s: membersIDSalt
                }));
            } catch (e) {
                if (e.name === 'invalidAccessKey') {
                    // ok
                } else {
                    throw e;
                }
            }
            await x.announceChanges(['group/' + groupID + '/invitations']);
        } else {
            throw new Error();
        }
        return status;
    };

    var getInvitationURL = async groupID => {
        // todo add current user crypto signature
        var currentUserID = x.currentUser.getID();

        var secrets = await get(groupID, ['membersKeys', 'membersIDSalt']);
        var membersKeys = secrets.membersKeys;
        var membersIDSalt = secrets.membersIDSalt;

        var accessKey = await x.generateRandomString(55);

        var memberData = await x.cryptoData.encrypt(x.pack('1', {
            d: x.getDateID(Date.now()), // date invited
            w: currentUserID // invite by
        }), x.keyBox.make(membersKeys));

        var encryptionKey = await x.crypto.deriveSymmetricKey(accessKey, groupID);
        var memberSecretData = await x.crypto.encrypt(encryptionKey, x.pack('', {
            g: groupID,
            u: currentUserID,
            k: membersKeys,
            s: membersIDSalt
        }));

        var invitationData = x.pack('1', { // 1 - no user specified
            m: memberData,
            w: memberSecretData
        });

        var response = await x.group.call(groupID, 'group.invitations.add', {
            data: invitationData,
            accessKey: await x.getHash('SHA-512', await x.getHash('SHA-512', accessKey))
        }, { auth: 'auto' });
        var status = response.status;
        if (status === 'ok') {
            await x.announceChanges(['group/' + groupID + '/invitations']);
            return groupID + ':' + accessKey;
        }
        // error
    };

    var detailsToShortDetails = details => {
        var result = [];
        details.forEach(detail => {
            if (detailsMap[detail] !== undefined) {
                result.push(detailsMap[detail]);
            }
        });
        return result;
    };

    var updateGroupProperties = group => {
        var result = {};
        for (var name in detailsMap) {
            var shortProperty = detailsMap[name];
            if (group[shortProperty] !== undefined) {
                result[name] = group[shortProperty];
            }
        }
        if (result.status !== undefined) {
            if (result.status === true || result.status === 1) {
                result.status = 'joined';
            } else if (result.status === 2) {
                result.status = 'pendingApproval';
            }
        }
        return result;
    };

    var getList = async (details) => {
        if (typeof details === 'undefined') {
            details = [];
        }
        var storage = getDetailsStorage();
        var list = await storage.getList(detailsToShortDetails(details));
        var result = [];
        for (var i in list) {
            result[i] = updateGroupProperties(list[i]);
        }
        return result;
    };

    var get = async (id, details) => {
        if (typeof details === 'undefined') {
            details = [];
        }
        var storage = getDetailsStorage();
        var result = await storage.get(id, detailsToShortDetails(details));
        if (result !== null) {
            return updateGroupProperties(result);
        }
        return null;
    };

    var exists = async id => {
        var storage = getDetailsStorage();
        var result = await storage.get(id);
        return result !== null;
    }

    var setGroupDetails = async (id, details) => {
        details.date = Date.now();
        var storage = getDetailsStorage();
        var data = {};
        for (var name in details) {
            data[detailsMap[name]] = details[name];
        }
        // todo if exists
        await storage.set(id, data);
        await x.announceChanges(['groups']);
    };

    // var getDetails = async (id, details) => {
    //     var storage = getDetailsStorage();
    //     var detailsToRequest = [];
    //     for (var name in detailsMap) {
    //         if (details.indexOf(name) !== -1) {
    //             detailsToRequest.push(detailsMap[name]);
    //         }
    //     }
    //     var result = await storage.get(id, detailsToRequest);
    //     var temp = {};
    //     details.forEach(name => {
    //         temp[name] = result !== null && typeof detailsMap[name] !== 'undefined' && typeof result[detailsMap[name]] !== 'undefined' ? result[detailsMap[name]] : null;
    //     });
    //     console.log(temp);
    //     return updateGroupProperties(temp);
    // };

    // var getMemberID = async id => {
    //     var storage = getDetailsStorage();
    //     var result = await storage.get(id, ['s']);
    //     if (result !== null) {
    //         return await x.groups.getMemberID(id, result.s);
    //     }
    //     return null;
    // };

    var addInvitation = async (groupID, details) => {
        await setGroupDetails(groupID, details);
    };

    var addURLInvitation = async (groupID, accessKey) => {
        if (await get(groupID) !== null) {
            return; // already added, dont overwrite
        }
        var response = await x.group.call(groupID, 'group.invitations.get', {
        }, { auth: 'accessKey', accessKey: accessKey });
        if (response.status === 'ok') {
            var data = response.result;
            var encryptionKey = await x.crypto.deriveSymmetricKey(accessKey, groupID);
            var decryptedData = await x.crypto.decrypt(encryptionKey, data);
            var data = x.unpack(decryptedData);
            if (data.name === '') {
                data = data.value;
                if (data.g === groupID) {
                    var details = {};
                    details.invitedBy = data.u; // validate
                    details.memberAccessKey = accessKey; // validate
                    details.membersKeys = data.k; // validate
                    details.membersIDSalt = data.s; // validate
                    await addInvitation(groupID, details);
                }
            }
        }
    };

    var join = async groupID => {
        // var group = await get(groupID, ['providedAccessKey']);
        // if (group.providedAccessKey === null) {
        //     group.providedAccessKey = await x.generateRandomString(50, true);
        //     var firewall = x.currentUser.getFirewall();
        //     await firewall.add(group.providedAccessKey);
        //     await setGroupDetails(groupID, { providedAccessKey: group.providedAccessKey });
        // }

        var secrets = await get(groupID, ['membersKeys', 'membersIDSalt']);
        var membersKeys = secrets.membersKeys;
        var membersIDSalt = secrets.membersIDSalt;

        // var sharedGroupAccessKey = await x.cryptoData.encrypt(x.pack('', {
        //     a: group.providedAccessKey
        // }), x.keyBox.make(membersKeys));

        var memberID = await x.groups.generateMemberID(x.currentUser.getID(), membersIDSalt);

        var memberData = await x.cryptoData.encrypt(x.pack('y', {
            i: x.currentUser.getID()
        }), x.keyBox.make(membersKeys));

        var newAccessKey = await x.generateRandomString(50, true);
        hashedAccessKey = await x.getHash('SHA-512', await x.getHash('SHA-512', newAccessKey));
        var response = await x.group.call(groupID, 'group.members.join', {
            memberID: memberID,
            newAccessKey: hashedAccessKey,
            memberData: memberData, // needed for URL invitations
            //sharedData: { 'g': sharedGroupAccessKey },
        }, { auth: 'auto' });
        var status = response.status;
        if (status === 'ok' || status === 'pendingApproval') {
            var storage = getDetailsStorage();
            await storage.set(groupID, { j: status === 'ok' ? 1 : 2, a: newAccessKey });
            await x.property.observeChanges(groupID, ['gm/' + memberID + '/s'], 'g');
            await x.announceChanges(['groups', 'group/' + groupID + '/members']);
        } else {
            // todo
        }
        return status;
    };

    var checkIfApproved = async groupID => {
        try {
            var details = await get(groupID, ['status']);
            if (details !== null && details.status !== 'joined') {
                var currentUserID = x.currentUser.getID();
                var memberID = await x.groups.getMemberID(groupID, currentUserID);
                var dataStorage = await x.group.getSharedDataStorage(groupID);
                if (await dataStorage.get('m/a/' + memberID + '/a') !== null) {
                    var storage = getDetailsStorage();
                    await storage.set(groupID, { j: 1 });
                    await x.announceChanges(['groups', 'group/' + groupID + '/members', 'group/' + groupID + '/member/' + currentUserID]);
                    var profile = await x.property.getProfile('group', groupID);
                    var notification = await x.notifications.make('gms$' + groupID);
                    notification.visible = true;
                    notification.title = 'Approved in ' + profile.name;
                    notification.text = 'You are now a member of this private group';
                    notification.image = { type: 'groupProfile', id: groupID };
                    notification.onClick = { location: 'group/home', args: { id: groupID } };
                    notification.tags = ['g'];
                    await x.notifications.set(notification);
                    // todo notification ???
                }
            }
        } catch (e) {
            // invalid access key
        }
    };

    var leave = async groupID => {
        //var group = await get(groupID);
        try {
            var response = await x.group.call(groupID, 'group.members.leave', {}, { auth: 'auto' });
            var status = response.status;
        } catch (e) {
            if (['invalidMemberID', 'invalidAccessKey', 'groupNotFound'].indexOf(e.name) !== -1) {
                var status = 'ok';
            } else {
                throw e;
            }
        }
        if (status === 'ok' || status === 'noSuchMember') {
            // if (group.providedAccessKey !== null) {
            //     var firewall = x.currentUser.getFirewall();
            //     await firewall.delete(group.providedAccessKey);
            // }
            var storage = getDetailsStorage();
            await storage.delete(groupID);
            try {
                await x.property.unobserveChanges(groupID, ['gp', 'gp/*', 'gm', 'gma', 'gmp', 'gi'], 'g');
                var memberID = await x.groups.getMemberID(groupID, x.currentUser.getID());
                if (memberID !== null) {
                    await x.property.unobserveChanges(groupID, ['gm/' + memberID + '/s'], 'g');
                }
                await x.services.call('group', 'modifyPendingMembersNotification', { action: 'delete', groupID: groupID, lastSeenUsersIDs: [] });
            } catch (e) {
                // todo
            }
            await x.announceChanges(['groups']);
            return true;
        } else {
            // todo
        }
    };

    // var getProvidedAccessKeys = async () => {
    //     var storage = getDetailsStorage();
    //     var list = await storage.getList(['b']);
    //     var result = {};
    //     for (var groupID in list) {
    //         var groupDetails = list[groupID];
    //         if (groupDetails.b !== null) {
    //             result[groupDetails.b] = { type: 'group', id: groupID };
    //         }
    //     }
    //     return result;
    // };

    return {
        createGroup: createGroup,
        get: get,
        getList: getList,
        join: join,
        leave: leave,
        invite: invite,
        getInvitationURL: getInvitationURL,
        addURLInvitation: addURLInvitation,
        addInvitation: addInvitation,
        //getProvidedAccessKeys: getProvidedAccessKeys,
        checkIfApproved: checkIfApproved,
        exists: exists
    };
};