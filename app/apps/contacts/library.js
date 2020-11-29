/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

() => {

    // todo the secret access keys should not be available to other apps
    // todo removed contact then added -> how connect when there is no public access key 
    // optimize public access keys add and delete

    // (async () => {
    //     var firewall = x.currentUser.getFirewall();
    //     await firewall.add('xxx');
    //     await firewall.add('xxx2');
    //     await firewall.delete('xxx');
    //     await firewall.add('xxx3');
    //     await firewall.delete('xxx3');
    // })();

    // (async () => {
    //     //console.table(await x.currentUser.getPrivateDataStorage().getList());
    // })();

    var contactsStorage = null;
    var getContactsStorage = () => {
        if (contactsStorage === null) {
            contactsStorage = x.currentUser.getDataStorage('p/c/').getDetailsContext('l-', x.currentUser.isPublic() ? x.currentUserCache.get('contacts-dc') : null);
        }
        return contactsStorage;
    };

    var oldConnectKeysStorage = null;
    var getOldConnectKeysStorage = () => {
        if (oldConnectKeysStorage === null) {
            oldConnectKeysStorage = x.currentUser.getDataStorage('p/c/').getDetailsContext('k-', x.currentUser.isPublic() ? x.currentUserCache.get('contactsk-dc') : null);
        }
        return oldConnectKeysStorage;
    };

    var connectKeysStorage = null;
    var getConnectKeysStorage = () => {
        if (connectKeysStorage === null) {
            connectKeysStorage = x.currentUser.getDataStorage('p/c/').getDetailsContext('y-', x.currentUser.isPublic() ? x.currentUserCache.get('contactsy-dc') : null);
        }
        return connectKeysStorage;
    };

    var requestsStorage = null;
    var getRequestsStorage = () => {
        if (requestsStorage === null) {
            requestsStorage = x.currentUser.getDataStorage('p/c/').getDetailsContext('p-', x.currentUser.isPublic() ? x.currentUserCache.get('contactsp-dc') : null);
        }
        return requestsStorage;
    };

    var cache = x.currentUserCache.get('contacts');

    var contactsDetailsMap = {
        name: 'n',
        identityKey: 'p',
        accessKey: 's',
        providedAccessKey: 'r',
        dateAdded: 'a',
        dateConnected: 'b',
        invitationSource: 'c'
    };

    var getDetailsContextValue = contact => {
        var data = {};
        for (var property in contactsDetailsMap) {
            data[contactsDetailsMap[property]] = contact[property];
        }
        return data;
    };

    var makeContact = (id, detailsContextValue) => {
        var contact = {
            id: null,
            name: null,
            identityKey: null,
            accessKey: null,
            providedAccessKey: null,
            dateAdded: null,
            dateConnected: null
        };
        if (id !== null) {
            contact.id = id;
        }
        if (typeof detailsContextValue !== 'undefined') {
            for (var property in contactsDetailsMap) {
                if (typeof detailsContextValue[contactsDetailsMap[property]] !== 'undefined') {
                    contact[property] = detailsContextValue[contactsDetailsMap[property]];
                }
            }
        }
        return contact;
    };

    var get = async userID => {
        var storage = getContactsStorage();
        var details = await storage.get(userID);
        if (details !== null) {
            return makeContact(userID, details);
        }
        return null;
    };

    var set = async contact => {
        var storage = getContactsStorage();
        await storage.set(contact.id, getDetailsContextValue(contact));
        await x.announceChanges(['contacts', 'contacts/' + contact.id]);
    };

    var remove = async userID => {
        var storage = getContactsStorage();
        var contact = await get(userID);
        if (contact !== null) {
            if (contact.providedAccessKey !== null) {
                var firewall = x.currentUser.getFirewall();
                await firewall.delete(contact.providedAccessKey);
            }
            await storage.delete(userID);
            await x.announceChanges(['contacts', 'contacts/' + userID]);
        }
    };

    var exists = async userID => {
        var storage = getContactsStorage();
        return await storage.exists(userID);
    };

    var getList = async () => { // todo details ???
        var storage = getContactsStorage();
        var list = await storage.getList(Object.values(contactsDetailsMap));
        var result = [];
        for (var userID in list) {
            result.push(makeContact(userID, list[userID]));
        }
        return result;
    };

    var setContactDetails = async (userID, details = {}) => {
        var currentUserID = x.currentUser.getID();
        if (currentUserID === userID) {
            return false;
        }
        var publicKeys = await x.user.getPublicKeys(userID);
        //console.log(publicKeys);
        if (publicKeys === null) { // or error
            return false;
        }
        var profile = await x.user.getProfile(userID);
        var contact = await get(userID);
        if (contact === null) {
            var contact = makeContact(userID);
            contact.dateAdded = x.getDateID(Date.now())
        }
        contact.name = profile.name;
        contact.identityKey = publicKeys.i;
        for (var property in details) {
            contact[property] = details[property];
        }
        await set(contact);
        await cache.delete('contacts/' + userID + '/accessKey');
        return true;
    };

    var add = async userID => {
        await setContactDetails(userID);
    };

    var sendRequest = async (userID, accessKey) => {
        var contact = await get(userID);
        var contactExists = contact !== null;
        var providedAccessKey = contactExists && contact.providedAccessKey !== null ? contact.providedAccessKey : x.generateRandomString(50, true);
        try {
            var dataToSend = x.pack('c', providedAccessKey);
            // Send connection request. It will fail if the key is invalid.
            var result = await x.user.send('cc', userID, dataToSend, {}, { accessKey: accessKey });
            if (result === true) {
                var updateFirewall = false;
                if (contactExists) {
                    if (contact.providedAccessKey !== providedAccessKey) {
                        await setContactDetails(userID, { providedAccessKey: providedAccessKey });
                        updateFirewall = true;
                    }
                } else {
                    await setContactDetails(userID, { providedAccessKey: providedAccessKey });
                    updateFirewall = true;
                }
                if (updateFirewall) {
                    var firewall = x.currentUser.getFirewall();
                    await firewall.add(providedAccessKey);
                }
            }
        } catch (e) {
            if (e.name === 'invalidAccessKey') {
                var result = false;
            } else {
                throw e;
            }
        }
        return result;
    };

    // var cancelRequest = async userID => {
    //     var contact = await get(userID);
    //     if (contact !== null && contact.providedAccessKey !== null) {
    //         var firewall = x.currentUser.getFirewall();
    //         await firewall.delete(contact.providedAccessKey);
    //         await setContactDetails(userID, { providedAccessKey: null });
    //     }
    // };

    var removeConnectNotification = async userID => {
        await x.notifications.delete('c$' + userID);
    };

    var approveRequest = async userID => {
        var contact = await get(userID);
        var contactSentRequestResult = false;
        if (contact !== null && contact.accessKey !== null) {
            var accessKey = contact.accessKey;
            if (accessKey !== null) {
                contactSentRequestResult = await sendRequest(userID, accessKey); // try this key
            }
        }
        var request = await getRequest(userID);
        if (request !== null) {
            var accessKey = request.accessKey;
            await setContactDetails(userID, { accessKey: accessKey });
            if (await sendRequest(userID, accessKey) || contactSentRequestResult) {
                await deleteRequest(userID);
            }
        }
    };

    var makeRequest = (userID, details) => {
        return {
            userID: userID,
            accessKey: (details.a !== undefined ? details.a : null),
            invitationSource: (details.i !== undefined ? details.i : null),
            dateCreated: (details.d !== undefined ? details.d : null)
        };
    };

    var getRequest = async userID => {
        var storage = getRequestsStorage();
        var data = await storage.get(userID);
        return data === null ? null : makeRequest(userID, data);
    };

    var deleteRequest = async userID => {
        var storage = getRequestsStorage();
        await storage.delete(userID);
        await removeConnectNotification(userID);
        await x.announceChanges(['contactsRequests', 'contactsRequests/' + userID]);
    };

    var addRequest = async (userID, accessKey, invitationSource) => { // return TRUE if new request or new connected contact
        var currentUserID = x.currentUser.getID();
        if (currentUserID === userID) {
            return false;
        }
        var contact = await get(userID);
        if (contact === null) {
            var storage = getRequestsStorage();
            var data = await storage.get(userID);
            var isNew = false;
            if (data === null) {
                data = {};
                isNew = true;
            }
            data.a = accessKey;
            data.i = invitationSource;
            data.d = x.getDateID(Date.now(), 1);
            await storage.set(userID, data);
            await x.announceChanges(['contactsRequests', 'contactsRequests/' + userID]);
            return isNew;
        } else {
            var isNewConnection = contact.accessKey === null;
            if (contact.accessKey === accessKey) {
                return false;
            }
            await setContactDetails(userID, { accessKey: accessKey, invitationSource: invitationSource });
            if (contact.providedAccessKey !== null) { // when the contact reconnects
                await sendRequest(userID, accessKey);
            }
            return isNewConnection;
        }
    };

    var getRequestsList = async () => {
        var storage = getRequestsStorage();
        var list = await storage.getList(['a', 'i', 'd']);
        var result = [];
        for (var userID in list) {
            result.push(makeRequest(userID, list[userID]));
        }
        return result;
    };

    var getAccessKey = async userID => {
        var cacheKey = 'contacts/' + userID + '/accessKey';
        var value = await cache.get(cacheKey);
        if (value === null) {
            var result = await get(userID);
            value = result !== null ? result.accessKey : null;
            await cache.set(cacheKey, value); // todo optimize - null case ???
        }
        return value;
    };

    var getIdentityKey = async userID => {
        var cacheKey = 'contacts/' + userID + '/identityKey';
        var value = await cache.get(cacheKey);
        if (value === null) {
            var result = await get(userID);
            value = result !== null ? result.identityKey : null;
            await cache.set(cacheKey, value); // todo optimize - null case ???
        }
        return value;
    };

    var getProvidedAccessKeys = async () => {
        var result = {};

        var storage = getContactsStorage();
        var list = await storage.getList(['r']);
        for (var contactID in list) {
            var contactDetails = list[contactID];
            if (contactDetails.r !== null) {
                result[contactDetails.r] = { type: 'contact', id: contactID };
            }
        }

        var storage = getConnectKeysStorage();
        var list = await storage.getList();
        for (var key in list) {
            result['k/' + key] = { type: 'connectKey', key: key };
        }

        if (await getOpenConnectStatus()) {
            result['o/c'] = { type: 'openConnect' };
        }

        var storage = getOldConnectKeysStorage();
        var list = await storage.getList();
        for (var key in list) {
            result[key] = { type: 'connectKey', key: key };
        }

        return result;
    };

    var makeConnectKey = (key, details) => {
        return {
            key: key,
            //name: (typeof details.n !== 'undefined' ? details.n : ''),
            dateCreated: (details.d !== undefined ? details.d : null)
        };
    };

    var getConnectKey = async key => {
        var storage = getConnectKeysStorage();
        var details = await storage.get(key);
        if (details !== null) {
            return makeConnectKey(key, details);
        }

        var storage = getOldConnectKeysStorage();
        var details = await storage.get(key);
        if (details !== null) {
            return makeConnectKey(key, details);
        }

        return null;
    };

    var setConnectKey = async key => {
        var storage = getConnectKeysStorage();
        // if (key === null) {
        //     for (var i = 0; i < 999; i++) {
        //         var newKey = x.generateRandomString(10);
        //         if (!(await storage.exists(newKey))) {
        //             key = newKey;
        //             break;
        //         }
        //     }
        //     if (key === null) {
        //         throw new Error();
        //     }
        // }
        if (!await storage.exists(key)) {
            await storage.set(key, { d: x.getDateID(Date.now(), 1) });
            var firewall = x.currentUser.getFirewall();
            await firewall.add('k/' + key);
            await firewall.add(key); // old format
        }
        await x.announceChanges(['contactsConnectKeys']);
        return key;
    };

    var deleteConnectKey = async key => {
        var storage = getConnectKeysStorage();
        await storage.delete(key);
        var firewall = x.currentUser.getFirewall();
        await firewall.delete('k/' + key);
        await x.announceChanges(['contactsConnectKeys']);
    };

    var getConnectKeysList = async () => {
        var result = [];

        var storage = getConnectKeysStorage();
        var list = await storage.getList(['d']);
        var addedKeys = [];
        for (var key in list) {
            addedKeys.push(key);
            result.push(makeConnectKey(key, list[key]));
        }

        var storage = getOldConnectKeysStorage();
        var list = await storage.getList(['d']);
        for (var key in list) {
            if (addedKeys.indexOf(key) === -1) {
                result.push(makeConnectKey(key, list[key]));
            }
        }

        return result;
    };

    var getOpenConnectStatus = async () => {
        var storage = x.currentUser.getDataStorage('p/c/');
        var value = await storage.get('oc');
        if (value !== null) {
            value = x.unpack(await x.currentUser.decrypt(value));
            if (value.name === '') {
                return value.value === 1;
            } else {
                throw new Error('')
            };
        }
        return false;
    };

    var setOpenConnectStatus = async allow => {
        var storage = x.currentUser.getDataStorage('p/c/');
        await storage.set('oc', await x.currentUser.encrypt(x.pack('', allow ? 1 : 0)));
        var firewall = x.currentUser.getFirewall();
        var firewallKey = 'o/c'; // open connect
        if (allow) {
            await firewall.add(firewallKey);
        } else {
            await firewall.delete(firewallKey);
        }
        await x.announceChanges(['contactsOpenStatus']);
    };

    return {
        add: add,
        get: get,
        exists: exists,
        remove: remove,
        getList: getList,
        addRequest: addRequest,
        getAccessKey: getAccessKey,
        getIdentityKey: getIdentityKey,
        getProvidedAccessKeys: getProvidedAccessKeys,
        sendRequest: sendRequest,
        //cancelRequest: cancelRequest,
        approveRequest: approveRequest,
        getConnectKeysList: getConnectKeysList,
        getConnectKey: getConnectKey,
        setConnectKey: setConnectKey,
        deleteConnectKey: deleteConnectKey,
        getOpenConnectStatus: getOpenConnectStatus,
        setOpenConnectStatus: setOpenConnectStatus,
        getRequest: getRequest,
        getRequestsList: getRequestsList,
        deleteRequest: deleteRequest
    };
};