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
            contactsStorage = x.currentUser.getDataStorage('p/c/').getDetailsContext('l-', x.currentUser.isPublic() ? x.cache.get('contacts-dc') : null);
        }
        return contactsStorage;
    };

    var connectKeysStorage = null;
    var getConnectKeysStorage = () => {
        if (connectKeysStorage === null) {
            connectKeysStorage = x.currentUser.getDataStorage('p/c/').getDetailsContext('k-', x.currentUser.isPublic() ? x.cache.get('contactsk-dc') : null);
        }
        return connectKeysStorage;
    };

    var cache = x.cache.get('contacts');

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
        if (contact.providedAccessKey !== null) {
            var firewall = x.currentUser.getFirewall();
            await firewall.delete(contact.providedAccessKey);
        }
        await storage.delete(userID);
        await x.announceChanges(['contacts', 'contacts/' + userID]);
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

    var setContactDetails = async (userID, details) => {
        if (typeof details === 'undefined') {
            details = {};
        }
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
        if (contact === null) {
            throw new Error(); // should not get here
        }
        var providedAccessKey = contact.providedAccessKey !== null ? contact.providedAccessKey : x.generateRandomString(50, true);
        try {
            var dataToSend = x.pack('c', providedAccessKey);
            // Send connect request. It will fail if the key is invalid.
            var result = await x.user.send('cc', userID, dataToSend, {}, { accessKey: accessKey });
            if (result === true) {
                if (contact.providedAccessKey !== providedAccessKey) {
                    await setContactDetails(userID, { providedAccessKey: providedAccessKey });
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

    var cancelRequest = async userID => {
        var contact = await get(userID);
        if (contact !== null && contact.providedAccessKey !== null) {
            var firewall = x.currentUser.getFirewall();
            await firewall.delete(contact.providedAccessKey);
            await setContactDetails(userID, { providedAccessKey: null });
        }
    };

    var approveRequest = async userID => {
        var contact = await get(userID);
        if (contact !== null && contact.accessKey !== null) {
            await sendRequest(userID, contact.accessKey);
        }
    }

    var addRequest = async (userID, accessKey, invitationSource) => {
        var currentUserID = x.currentUser.getID();
        if (currentUserID === userID) {
            return false;
        }
        var contact = await get(userID);
        var isNewContact = contact === null;
        var isInvitation = isNewContact || contact.accessKey === null;
        if (contact !== null && contact.accessKey === accessKey) {
            return false;
        }
        //var isNewContact = contact === null || contact.accessKey === null;
        await setContactDetails(userID, { accessKey: accessKey, invitationSource: invitationSource });
        if (!isNewContact && contact.providedAccessKey !== null) { // when the contact reconnects
            await sendRequest(userID, accessKey);
        }
        return isInvitation;
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
            result[key] = { type: 'connectKey', key: key };
        }
        return result;
    };

    var makeConnectKey = (key, details) => {
        return {
            key: key,
            name: (typeof details.n !== 'undefined' ? details.n : ''),
            dateCreated: (typeof details.d !== 'undefined' ? details.d : null)
        };
    };

    var getConnectKey = async key => {
        var storage = getConnectKeysStorage();
        var details = await storage.get(key);
        if (details !== null) {
            return makeConnectKey(key, details);
        }
        return null;
    };

    var setConnectKey = async (key, name) => {
        var storage = getConnectKeysStorage();
        if (key === null) {
            for (var i = 0; i < 999; i++) {
                var newKey = x.generateRandomString(10);
                if (!(await storage.exists(newKey))) {
                    key = newKey;
                    break;
                }
            }
            if (key === null) {
                throw new Error();
            }
        }
        if (await storage.exists(key)) {
            await storage.set(key, { n: name });
        } else {
            await storage.set(key, { n: name, d: x.getDateID(Date.now(), 1) });
            var firewall = x.currentUser.getFirewall();
            await firewall.add(key);
        }
        await x.announceChanges(['contactsConnectKeys']);
        return key;
    };

    var deleteConnectKey = async key => {
        var storage = getConnectKeysStorage();
        await storage.delete(key);
        var firewall = x.currentUser.getFirewall();
        await firewall.delete(key);
        await x.announceChanges(['contactsConnectKeys']);
    };

    var getConnectKeysList = async () => {
        var storage = getConnectKeysStorage();
        var list = await storage.getList(['n', 'd']);
        var result = [];
        for (var key in list) {
            result.push(makeConnectKey(key, list[key]));
        }
        return result;
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
        cancelRequest: cancelRequest,
        approveRequest: approveRequest,
        getConnectKeysList: getConnectKeysList,
        getConnectKey: getConnectKey,
        setConnectKey: setConnectKey,
        deleteConnectKey: deleteConnectKey
    };
};