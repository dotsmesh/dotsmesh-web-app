(x) => {

    try {
        x.coreEvents = x.makeEventTarget();
    } catch (e) { // temp for ios

    }

    var localCache = {};

    var processLocalDataStorageCommands = null;

    // SERVER REQUESTS

    let callAPI = async (host, method, args = {}, options = {}) => {
        var data = {
            method: method,
            args: args,
            options: options
        };
        try {
            var response = await fetch('https://dotsmesh.' + host + '/?host&api', {
                method: 'POST',
                cache: 'no-cache',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                referrerPolicy: 'no-referrer',
                body: JSON.stringify(data)
            });
        } catch (e) {
            var error = x.makeAppError('networkError', e.message);
            error.details['callAPI'] = {
                host: host,
                method: method
            };
            throw error;
        }
        // TODO timeout
        var response = await response.text();
        try {
            var result = JSON.parse(response);
            if (typeof result.status !== 'undefined') {
                if (result.status === 'ok') {
                    return result.result;
                } else if (result.status === 'error') {
                    var error = x.makeAppError({ name: result.code, message: result.message });
                } else {
                    var error = x.makeAppError('invalidResponse', 'Invalid status!');
                }
            } else {
                var error = x.makeAppError('invalidResponse', 'Status not found!');
            }
        } catch (e) {
            var error = x.makeAppError('invalidResponse', e.message);
        };
        error.details['callAPI'] = {
            host: host,
            method: method,
            response: response
        };
        throw error;
    };

    // CURRENT USER

    var currentUserData = null;

    {

        let hashUserPassword = async (id, password) => {
            var hashedPassword = await x.getHash('SHA-512', password);
            return await x.getHash('SHA-512', hashedPassword + '$' + id);
        };

        let getPushSubscription = async propertyHost => {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                var registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    try {
                        var subscription = await registration.pushManager.getSubscription();
                        if (subscription === null) {
                            var urlB64ToUint8Array = base64String => {
                                var padding = '='.repeat((4 - base64String.length % 4) % 4);
                                var base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                                var rawData = atob(base64);
                                var outputArray = new Uint8Array(rawData.length);
                                for (let i = 0; i < rawData.length; ++i) {
                                    outputArray[i] = rawData.charCodeAt(i);
                                }
                                return outputArray;
                            }
                            var response = await fetch('https://dotsmesh.' + propertyHost + '/?host&pushkey', { referrerPolicy: 'no-referrer' });
                            var pushKey = await response.text();
                            var subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(pushKey) });
                        }
                        return JSON.stringify(subscription);
                    } catch (e) {
                        // push denied, incognito mode, ...
                    }
                }
            }
            return '';
        };

        // let unregisterServiceWorker = () => {
        //     return new Promise(async (resolve, reject) => {
        //         var registrations = await navigator.serviceWorker.getRegistrations();
        //         if (registrations.length === 0) {
        //             resolve();
        //             return;
        //         }
        //         for (let registration of registrations) {
        //             registration.unregister()
        //                 .then(result => {
        //                     if (result === true) {
        //                         resolve();
        //                     } else {
        //                         reject();
        //                     }
        //                 });
        //         }
        //     })
        // };

        var backgroundTasksInterval = null;

        let onLogin = async () => {
            x.runBackgroundTasks(); // async call
            backgroundTasksInterval = setInterval(x.runBackgroundTasks, 60 * 2000);
        };

        let logoutUser = async userID => {
            clearInterval(backgroundTasksInterval);
            currentUserData = null;
            var emptyDB = async (name, prefix) => {
                try {
                    var db = getDB(name);
                    await db.deleteKeys(prefix);
                } catch (e) {
                    //console.log(e);
                }
                //deleteDB(name); // async on purpose
            }
            localCache = {};
            await Promise.all([
                x.cache.clear(),
                //unregisterServiceWorker(),
                emptyDB("dotsmesh-app", await getUserAppDBPrefix(userID) + 's/'), // session data
                setLoggedOutUser(userID)
            ]);
        };

        let getLoggedInUsersList = async () => {
            var users = await appDB.get('a');
            if (users !== null) {
                var users = x.unpack(users);
                if (users.name === '') {
                    var userIDs = users.value;
                    return userIDs;
                }
            }
            return [];
        };

        let setLoggedInUser = async userID => {
            var usersIDs = await getLoggedInUsersList();
            usersIDs.push(userID);
            usersIDs = x.arrayUnique(usersIDs);
            await appDB.set('a', x.pack('', usersIDs));
        };

        let setLoggedOutUser = async userID => {
            var usersIDs = await getLoggedInUsersList();
            usersIDs = x.removeFromArray(usersIDs, userID);
            if (usersIDs.length === 0) {
                await appDB.delete('a');
            } else {
                await appDB.set('a', x.pack('', usersIDs));
            }
        };

        let getPrivateUsers = async () => {
            var users = await appDB.get('z');
            if (users !== null) {
                var users = x.unpack(users);
                if (users.name === '') {
                    var userIDs = users.value;
                    return userIDs;
                }
            }
            return [];
        };

        let addPrivateUser = async userID => {
            var usersIDs = await getPrivateUsers();
            usersIDs.push(userID);
            usersIDs = x.arrayUnique(usersIDs);
            await appDB.set('z', x.pack('', usersIDs));
        };

        x.currentUser = {};

        x.currentUser.exists = () => {
            return currentUserData !== null;
        };

        x.currentUser.getID = () => {
            return currentUserData !== null ? currentUserData.userID : null;
        };

        x.currentUser.getSalt = () => {
            return currentUserData !== null ? currentUserData.salt : null;
        };

        x.currentUser.isPrivate = () => {
            if (currentUserData !== null) {
                return x.isPrivateID(currentUserData.userID);
            }
            return false;
        };

        x.currentUser.isPublic = () => {
            if (currentUserData !== null) {
                return !x.isPrivateID(currentUserData.userID);
            }
            return false;
        };

        x.currentUser.signup = async (profileKey, id, password) => { // TRUE - successfull, FALSE - error, userExists
            var host = x.getPropertyKeyHost(profileKey);
            if (host === null) {
                return 'invalidProfileKey';
            }

            var identityKeyPair = await x.crypto.generateKeyPair('ECDSA-P-521');

            var privateKeys = x.keyBox.make();
            var publicKeys = x.keyBox.make();

            var keyPair = await x.crypto.generateKeyPair('RSA-OAEP-4096');
            var keyID = privateKeys.add(keyPair.privateKey);
            publicKeys.set(keyID, keyPair.publicKey);
            var keyPair = await x.crypto.generateKeyPair('ECDSA-P-256');
            var keyID = privateKeys.add(keyPair.privateKey);
            publicKeys.set(keyID, keyPair.publicKey);

            var privateData = {
                is: identityKeyPair.privateKey,
                i: identityKeyPair.publicKey,
                ks: privateKeys.getValue(),
                k: publicKeys.getValue(),
                a: await x.generateRandomString(34, true) // salt
            };
            var publicKeysValue = publicKeys.getValue();
            var publicData = {
                i: identityKeyPair.publicKey,
                k: publicKeysValue,
                s: await x.crypto.sign(identityKeyPair.privateKey, publicKeysValue)
            };
            var passwordBasedKey = await x.crypto.deriveSymmetricKey(password, id);
            var authKey = await hashUserPassword(id, password);
            var authData = await x.crypto.encrypt(passwordBasedKey, x.pack('0', privateData));
            var response = await callAPI(host, 'user.signup', {
                id: id,
                profileKey: profileKey,
                authKey: authKey,
                authData: authData,
                publicKeys: x.pack('', publicData)
            });
            var status = response.status;
            if (status === 'ok') {
                return true;
            }
            return status;
        };

        x.currentUser.login = async (id, password) => { // TRUE - successful, FALSE - error, invalidAuthKey, userNotFound
            var idData = x.parseID(id);
            var authKey = await hashUserPassword(id, password);
            var sessionSecret = x.generateRandomString(50, true);
            var sessionData = x.pack('0', sessionSecret);
            var pushSubscription = await getPushSubscription(idData.host);
            var response = await callAPI(idData.host, 'user.login', {
                id: id,
                authKey: authKey,
                sessionData: sessionData,
                pushSubscription: pushSubscription
            });
            var status = response.status;
            if (status === 'ok') {
                var passwordBasedKey = await x.crypto.deriveSymmetricKey(password, id);
                var authData = await x.crypto.decrypt(passwordBasedKey, response.authData);
                authData = x.unpack(authData);
                var sessionSecretKey = await x.crypto.deriveSymmetricKey(sessionSecret, id);
                if (authData.name === '0') {
                    var authValue = authData.value;
                    var sessionKey = response.sessionKey;
                    currentUserData = {
                        userID: id,
                        sessionKey: sessionKey,
                        identityPrivateKey: authValue.is,
                        identityPublicKey: authValue.i,
                        privateKeys: x.keyBox.make(authValue.ks),
                        publicKeys: x.keyBox.make(authValue.k),
                        salt: authValue.a !== undefined ? authValue.a : 'x'
                    };
                    await setLoggedInUser(id);
                    await appDB.set(await getUserAppDBPrefix(id) + 's/a', { // session data
                        is: await x.crypto.encrypt(sessionSecretKey, authValue.is),
                        i: await x.crypto.encrypt(sessionSecretKey, authValue.i),
                        ks: await x.crypto.encrypt(sessionSecretKey, authValue.ks),
                        k: await x.crypto.encrypt(sessionSecretKey, authValue.k),
                        a: await x.crypto.encrypt(sessionSecretKey, currentUserData.salt),
                        s: sessionKey
                    });
                    await onLogin();
                    return true;
                } else {
                    throw new Error();
                }
            } else if (status === 'error') {
                // error
            } else {
                return status;
            }
        };

        x.currentUser.autoLogin = async () => {
            var loggedInUsersIDs = await getLoggedInUsersList();
            if (loggedInUsersIDs.length === 0) {
                return false;
            }
            var userID = loggedInUsersIDs[0];
            if (x.isPrivateID(userID)) {
                if (await x.currentUser.loginPrivateUser(userID)) {
                    await onLogin();
                    return true;
                } else {
                    return false;
                }
            } else if (x.isPublicID(userID)) {
                var currentUserLocalData = await appDB.get(await getUserAppDBPrefix(userID) + 's/a');
                if (currentUserLocalData.i === undefined || currentUserLocalData.is === undefined) { // an updated data is missing, added on 24-6-2020, remove in the future
                    await logoutUser(userID);
                    return false;
                }
                var sessionKey = currentUserLocalData.s;
                //var id = currentUserLocalData.i;
                var idData = x.parseID(userID);
                var pushSubscription = await getPushSubscription(idData.host);
                try {
                    var response = await x.user.call(userID, 'user.autoLogin', {
                        pushSubscription: pushSubscription
                    }, {
                        auth: 'sessionKey',
                        sessionKey: sessionKey
                    });
                } catch (e) {
                    await logoutUser(userID);
                    return false;
                }
                var sessionData = x.unpack(response.sessionData);
                if (sessionData.name === '0') {
                    var sessionSecret = sessionData.value;
                } else {
                    throw new Error();
                }
                var sessionSecretKey = await x.crypto.deriveSymmetricKey(sessionSecret, userID);
                currentUserData = {
                    userID: userID,
                    sessionKey: sessionKey,
                    identityPrivateKey: await x.crypto.decrypt(sessionSecretKey, currentUserLocalData.is),
                    identityPublicKey: await x.crypto.decrypt(sessionSecretKey, currentUserLocalData.i),
                    privateKeys: x.keyBox.make(await x.crypto.decrypt(sessionSecretKey, currentUserLocalData.ks)),
                    publicKeys: x.keyBox.make(await x.crypto.decrypt(sessionSecretKey, currentUserLocalData.k)),
                    salt: currentUserLocalData.a !== undefined ? await x.crypto.decrypt(sessionSecretKey, currentUserLocalData.a) : 'x'
                };
                await onLogin();
                return true;
            } else {
                return false;
            }
        };

        x.currentUser.setNewPassword = async (oldPassword, newPassword) => {
            var userID = currentUserData.userID;
            var oldAuthKey = await hashUserPassword(userID, oldPassword);

            var privateData = {
                is: currentUserData.identityPrivateKey,
                i: currentUserData.identityPublicKey,
                ks: currentUserData.privateKeys.getValue(),
                k: currentUserData.publicKeys.getValue(),
                a: currentUserData.salt
            };
            var newPasswordBasedKey = await x.crypto.deriveSymmetricKey(newPassword, userID);
            var newAuthKey = await hashUserPassword(userID, newPassword);
            var newAuthData = await x.crypto.encrypt(newPasswordBasedKey, x.pack('0', privateData));
            var response = await x.user.call(userID, 'user.updateAuth', {
                oldAuthKey: oldAuthKey,
                newAuthKey: newAuthKey,
                newAuthData: newAuthData
            }, { auth: 'auto' });
            return response.status;
        };

        x.currentUser.logout = async () => {
            var userID = x.currentUser.getID();
            if (x.isPrivateID(userID)) {
                await logoutUser(userID);
                return true;
            } else if (x.isPublicID(userID)) {
                var response = await x.user.call(userID, 'user.logout', {}, { auth: 'auto' });
                // todo if invalid session
                if (response === 'ok') {
                    await logoutUser(userID);
                    return true;
                } else {
                    //todo
                }
            } else {
                throw new Error();
            }
        };

        x.currentUser.createPrivateUser = async () => { // todo better name
            var identityKeyPair = await x.crypto.generateKeyPair('ECDSA-P-256');
            var userID = '-0' + btoa(identityKeyPair.publicKey);

            var privateKeys = x.keyBox.make();
            var publicKeys = x.keyBox.make();

            var keyID = privateKeys.add(identityKeyPair.privateKey);
            publicKeys.set(keyID, identityKeyPair.publicKey);

            var keyPair = await x.crypto.generateKeyPair('RSA-OAEP-4096');
            var keyID = privateKeys.add(keyPair.privateKey);
            publicKeys.set(keyID, keyPair.publicKey);

            await addPrivateUser(userID);

            await appDB.set(await getUserAppDBPrefix(userID) + 'k', x.pack('0', {
                ks: privateKeys.getValue(),
                k: publicKeys.getValue(),
                a: await x.generateRandomString(35, true) // salt
            }));

            return userID;
        };

        x.currentUser.loginPrivateUser = async userID => {
            var keys = await appDB.get(await getUserAppDBPrefix(userID) + 'k');
            if (keys !== null) {
                var keys = x.unpack(keys);
                if (keys.name === '0') {
                    var keysValue = keys.value;
                    // local user always sign with their master identity key (others dont have access to other keys)
                    // the identityPrivateKey and identityPublicKey are not set in the currentUserData because they are not needed by the app core
                    currentUserData = {
                        userID: userID,
                        privateKeys: x.keyBox.make(keysValue.ks),
                        publicKeys: x.keyBox.make(keysValue.k),
                        salt: keysValue.a !== undefined ? keysValue.a : 'x',
                    };
                    // var list = currentUserData.privateKeys.getList();
                    // for (var key of list) {
                    //     if (key.operation === 'sign') {
                    //         currentUserData.identityPrivateKey = key.key;
                    //         break;
                    //     }
                    // }
                    // var list = currentUserData.publicKeys.getList();
                    // for (var key of list) {
                    //     if (key.operation === 'verify') {
                    //         currentUserData.identityPublicKey = key.key;
                    //         break;
                    //     }
                    // }
                    await setLoggedInUser(userID);
                    return true;
                }
            }
            return false;
        };

        x.currentUser.getPrivateUsers = async () => { // todo better name
            return await getPrivateUsers();
        };

        x.currentUser.announceChanges = async keys => {
            var currentUserID = x.currentUser.getID();
            var hashedKeys = [];
            for (var i = 0; i < keys.length; i++) {
                hashedKeys.push(await x.getHash('SHA-512-10', currentUserID + '$' + keys[i]));
            }
            await x.user.call(currentUserID, 'user.changes.announce', { keys: hashedKeys }, { auth: 'auto' });
        };

        x.currentUser.encrypt = async text => {
            return await x.cryptoData.encrypt(text, currentUserData.publicKeys);
        };

        x.currentUser.decrypt = async text => {
            return await x.cryptoData.decrypt(text, currentUserData.privateKeys);
        };

        x.currentUser.sign = async text => {
            return await x.cryptoData.sign(text, currentUserData.privateKeys);
        };

        var getCurrentUserDataStorage = (prefix = '') => { // should not have a local cache because of data storage buffers
            return x.dataStorage.get(async commands => {
                if (x.currentUser.isPrivate()) {
                    var results = await processLocalDataStorageCommands(commands);
                    //console.log(results);
                    return results;
                }
                // todo is public
                var results = await x.user.call(x.currentUser.getID(), 'user.dataStorage', {
                    type: 'f',
                    commands: commands
                }, { auth: 'auto' });
                // console.table(commands);
                // console.table(results);
                return results;
            }, prefix);
        };

        x.currentUser.getPrivateProfileDetail = async key => {
            var dataStorage = getCurrentUserDataStorage();
            return await dataStorage.get('s/p/' + key);
        };

    }

    // DB

    let getDB = name => { // rename to localDB, update API to match DataStorage. move to utilities
        var getStore = () => {
            return new Promise((resolve, reject) => {
                var request = indexedDB.open(name, 1);
                request.onupgradeneeded = e => {
                    var db = e.target.result;
                    db.createObjectStore(name, { autoIncrement: false, keyPath: 'key' })
                        .createIndex("key", "key", { unique: true });
                };
                request.onsuccess = e => {
                    var db = e.target.result;
                    var objectStore = db.transaction([name], "readwrite").objectStore(name);
                    resolve(objectStore);
                };
                request.onerror = e => {
                    reject();
                };
            });
        }

        var set = async (key, value) => {
            var store = await getStore();
            return new Promise(async (resolve, reject) => {
                var request = store.put({ key: key, value: value });
                request.onsuccess = () => {
                    resolve();
                };
                request.onerror = e => {
                    reject();
                };
            });
        };

        var get = async key => {
            var store = await getStore();
            return new Promise(async (resolve, reject) => {
                var request = store.get(key);
                request.onsuccess = () => {
                    if (typeof request.result === 'undefined') {
                        resolve(null);
                    } else if (request.result.key === key) {
                        resolve(request.result.value);
                    }
                };
                request.onerror = e => {
                    reject();
                };
            });
        };

        var _delete = async key => {
            var store = await getStore();
            return new Promise(async (resolve, reject) => {
                var request = store.delete(key);
                request.onsuccess = () => {
                    resolve();
                };
                request.onerror = e => {
                    reject();
                };
            });
        };

        var getAllKeys = async () => {
            var store = await getStore();
            return new Promise(async (resolve, reject) => {
                var request = store.getAllKeys();
                request.onsuccess = () => {
                    resolve(request.result);
                };
                request.onerror = e => {
                    reject();
                };
            });
        };

        var deleteKeys = async prefix => {
            if (typeof prefix === 'undefined' || prefix === null) {
                prefix = '';
            }
            var keys = await getAllKeys();
            if (keys.length > 0) {
                var store = await getStore();
                for (var i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    if (prefix === '' || (prefix !== '' && key.indexOf(prefix) === 0)) {
                        await store.delete(key);
                    }
                }
            }
        };
        return {
            set: set,
            get: get,
            delete: _delete,
            getAllKeys: getAllKeys,
            deleteKeys: deleteKeys,
        };
    };

    // var deleteDB = async name => {
    //     return new Promise((resolve, reject) => { // deleting the DB is slow
    //         var request = indexedDB.deleteDatabase(name);
    //         request.onerror = e => {
    //             reject();
    //         };
    //         request.onsuccess = e => {
    //             if (typeof e.result === 'undefined') {
    //                 resolve();
    //             } else {
    //                 reject();
    //             }
    //         };
    //     });
    // };

    // APP DB

    var getUserAppDBPrefix = async userID => {
        return 'u/' + (await x.crypto.deriveID(userID)) + '/';
    }

    let appDB = {};

    {

        appDB.set = async (key, value) => {
            var db = getDB("dotsmesh-app");
            await db.set(key, value);
        };

        appDB.get = async key => {
            var db = getDB("dotsmesh-app");
            return await db.get(key);
        };

        appDB.delete = async key => {
            var db = getDB("dotsmesh-app");
            await db.delete(key);
        };

        appDB.getAllKeys = async () => {
            var db = getDB("dotsmesh-app");
            return await db.getAllKeys();
        };

        appDB.deleteKeys = async prefix => {
            var db = getDB("dotsmesh-app");
            await db.deleteKeys(prefix);
        };

    }

    // LOCAL DATA STORAGE

    processLocalDataStorageCommands = async commands => {
        var prefix = await getUserAppDBPrefix(x.currentUser.getID()) + 'd/';
        //console.table(commands);
        var results = [];
        for (var i = 0; i < commands.length; i++) {
            var command = commands[i];
            switch (command.command) {
                case 'set':
                    await appDB.set(prefix + command.key, command.value);
                    results.push(null);
                    break;
                case 'get':
                    var value = await appDB.get(prefix + command.key);
                    results.push(value);
                    break;
                case 'exists':
                    var value = await appDB.get(prefix + command.key);
                    results.push(value !== null);
                    break;
                case 'delete':
                    await appDB.delete(prefix + command.key);
                    results.push(null);
                    break;
                case 'rename':
                    var value = await appDB.get(prefix + command.sourceKey);
                    if (value !== null) {
                        await appDB.set(prefix + command.targetKey, value);
                        await appDB.delete(prefix + command.sourceKey);
                    }
                    results.push(null);
                    break;
                case 'duplicate':
                    var value = await appDB.get(prefix + command.sourceKey);
                    if (value !== null) {
                        await appDB.set(prefix + command.targetKey, value);
                    }
                    results.push(null);
                    break;
                case 'getList':
                    var commandOptions = typeof command.options !== 'undefined' ? command.options : {};
                    var startWith = prefix;
                    if (typeof commandOptions.keyStartWith !== 'undefined') {
                        startWith += commandOptions.keyStartWith;
                    }
                    var keyEndWith = typeof commandOptions.keyEndWith !== 'undefined' ? commandOptions.keyEndWith : null;
                    var sliceProperties = typeof commandOptions.sliceProperties !== 'undefined' ? commandOptions.sliceProperties : null;
                    var keysToReturn = typeof commandOptions.keys !== 'undefined' ? commandOptions.keys : null;
                    var itemResults = [];
                    var tempResults = {};
                    var cachedValues = {};
                    if (keysToReturn === null) {
                        var keys = await appDB.getAllKeys();
                    } else {
                        var keys = [];
                        for (var i = 0; i < keysToReturn.length; i++) {
                            var fullKey = prefix + keysToReturn[i];
                            var value = await appDB.get(fullKey);
                            if (value !== null) {
                                keys.push(fullKey);
                                cachedValues[fullKey] = value;
                            }
                        }
                    }
                    if (keys.length > 0) {
                        var hasItems = false;
                        var startWithLength = startWith.length;
                        for (var i = 0; i < keys.length; i++) {
                            var key = keys[i];
                            var add = false;
                            if (key.substr(0, startWithLength) === startWith) {
                                add = true;
                            }
                            if (add && keyEndWith !== null) {
                                if (key.substr(key.length - keyEndWith.length) !== keyEndWith) {
                                    add = false;
                                }
                            }
                            if (add) {
                                tempResults[key.substr(startWithLength)] = null;
                                hasItems = true;
                            }
                        }
                        if (hasItems) {
                            if (typeof commandOptions.keySort !== 'undefined') {
                                tempResults = commandOptions.keySort === 'asc' ? x.sortObjectKeyAsc(tempResults) : x.sortObjectKeyDesc(tempResults);
                            }
                        }
                        for (var key in tempResults) {
                            itemResults.push({
                                key: key
                            });
                        }
                        if (itemResults.length > 0) {
                            if (typeof commandOptions.limit !== 'undefined') {
                                var offset = typeof commandOptions.offset !== 'undefined' ? commandOptions.offset : 0;
                                itemResults = itemResults.slice(offset, offset + commandOptions.limit);
                            }
                            if (sliceProperties === null || sliceProperties.indexOf('value') !== -1) {
                                for (var i = 0; i < itemResults.length; i++) {
                                    var fullKey = startWith + itemResults[i].key;
                                    itemResults[i].value = typeof cachedValues[fullKey] !== 'undefined' ? cachedValues[fullKey] : await appDB.get(fullKey);
                                }
                            }
                        }
                    }
                    results.push(itemResults);
                    break;
            }
        }
        return results;
    };

    // (async () => {
    //     currentUserData = {
    //         userID: '-dev'
    //     };
    //     var dataStorage = getCurrentUserDataStorage();
    //     console.log(await dataStorage.set('dev/key1', 'value1'));
    //     console.log(await dataStorage.get('dev/key1'));
    //     console.log(await dataStorage.get('dev/key2'));
    //     console.log(await dataStorage.exists('dev/key1'));
    //     console.log(await dataStorage.exists('dev/key2'));
    //     console.log(await dataStorage.delete('dev/key1'));
    //     console.log(await dataStorage.get('dev/key1'));
    //     console.log(await dataStorage.set('dev/key2', 'value2'));
    //     console.log(await dataStorage.rename('dev/key2', 'dev/key3'));
    //     console.log(await dataStorage.get('dev/key2'));
    //     console.log(await dataStorage.get('dev/key3'));
    //     console.table(await dataStorage.getList({ keyStartWith: 'dev/' }));
    //     console.log(await dataStorage.set('dev/key1', 'value1'));
    //     console.log(await dataStorage.set('dev/key2', 'value2'));
    //     console.log(await dataStorage.set('dev/key3', 'value3'));
    //     console.table(await dataStorage.getList({ keyStartWith: 'dev/', keySort: 'desc' }));
    //     console.table(await dataStorage.getList({ keyStartWith: 'dev/', keySort: 'asc' }));
    //     console.table(await dataStorage.getList({ keyStartWith: 'dev/', keySort: 'asc', limit: 2 }));
    //     console.table(await dataStorage.getList({ keyStartWith: 'dev/', keySort: 'asc', limit: 2, offset: 1 }));
    //     console.table(await dataStorage.getList({ keyStartWith: 'dev/', keySort: 'asc', sliceProperties: ['key'] }));
    //     console.table(await dataStorage.getList({ keys: ['dev/key1', 'dev/key3'], keySort: 'desc' }));
    //     console.table(await dataStorage.getList({ keys: ['dev/key1', 'dev/key3'], keySort: 'asc' }));
    // })();

    var propertyCall = async (type, id, method, args = {}, options = {}) => {
        var currentUserExists = x.currentUser.exists();
        var authType = typeof options.auth !== 'undefined' ? options.auth : null;
        var callOptions = {};
        var idData = x.parseID(id);
        // todo if(idData === null)
        callOptions.propertyID = id;
        if (authType === 'accessKey') {
            callOptions.accessKey = await x.getHash('SHA-512', options.accessKey);
        } else if (authType === 'sessionKey') {
            callOptions.sessionKey = await x.getHash('SHA-512', options.sessionKey);
        } else if (authType === 'auto') {
            var cacheKey = 'propertyCall/' + type + '/' + id + '/' + authType;
            if (typeof localCache[cacheKey] === 'undefined') {
                var currentUserID = x.currentUser.getID();
                if (type === 'user') {
                    if (currentUserID === id) {
                        if (x.isPublicID(currentUserID)) {
                            callOptions.sessionKey = await x.getHash('SHA-512', currentUserData.sessionKey);
                        }
                    } else {
                        if (currentUserExists) {
                            var accessKey = await x.services.call('contacts', 'getAccessKey', { userID: id });
                            if (accessKey !== null) {
                                callOptions.accessKey = await x.getHash('SHA-512', accessKey);
                            }
                        }
                    }
                } else if (type === 'group') {
                    if (currentUserExists) {
                        var properties = await x.services.call('groups', 'getDetails', { groupID: id, details: ['memberAccessKey', 'status'] });
                        if (properties !== null) {
                            callOptions.accessKey = await x.getHash('SHA-512', properties.memberAccessKey);
                            callOptions.memberID = properties.status !== null ? await x.groups.getMemberID(id, currentUserID) : null;
                        } else {
                            throw x.makeAppError('invalidMemberID', 'No info about this group!');
                        }
                    } else {
                        throw x.makeAppError('invalidMemberID', 'No current user!');
                    }
                }
                localCache[cacheKey] = callOptions;
            } else {
                callOptions = localCache[cacheKey];
            }
        }
        return await callAPI(idData.host, method, args, callOptions);
    };

    // USERS

    {

        x.user = {};

        x.user.call = async (userID, method, args, options) => {
            return await propertyCall('user', userID, method, args, options);
        };

        x.user.send = async (type, userID, data, resources = {}, options = {}) => {

            // todo cache
            var identityKey = await x.services.call('contacts', 'getIdentityKey', { userID: userID });
            if (identityKey === null) {
                // todo
                return;
            }
            // todo cache
            var publicKeys = await x.user.getPublicKeys(userID); // todo check signature
            if (publicKeys === null) {
                // todo
                return;
            }
            var keyBox = x.keyBox.make(publicKeys.k);

            var encryptedResources = {};
            for (var resourceID in resources) {
                var resourceValue = resources[resourceID];
                encryptedResources[resourceID] = await x.cryptoData.encrypt(x.pack('x', resourceValue), keyBox); // how sign and save when the other user just moves it ???
            }
            var currentUserID = x.currentUser.getID();
            var dataToSend = { u: currentUserID, t: type, d: data };

            dataToSend = x.pack('1', dataToSend);
            var encryptedData = await x.cryptoData.encrypt(x.pack('', [dataToSend, await x.currentUser.sign(dataToSend)]), keyBox);
            // console.log('x.user.send', {
            //     type: type,
            //     userID: userID,
            //     data: data,
            //     resources: resources,
            //     options: options,
            //     encryptedData: encryptedData,
            //     encryptedResources: encryptedResources
            // });
            var result = await x.user.call(userID, 'user.inbox', {
                data: encryptedData,
                resources: encryptedResources
            },
                (options.accessKey !== undefined ? { auth: 'accessKey', accessKey: options.accessKey } : { auth: 'auto' })
            );
            return result === 'ok';
        };

        x.user.getPublicKeys = async userID => {
            var dataStorage = x.dataStorage.get(async commands => {
                return x.user.call(userID, 'user.dataStorage', {
                    type: 's',
                    commands: commands
                }, { auth: 'auto' });
            });
            var value = await dataStorage.get('keys');
            if (value !== null) {
                value = x.unpack(value);
                if (value.name === '') {
                    return value.value;
                }
            }
            return null;
        };

    }



    // GROUPS

    {

        x.group = {};

        x.group.call = async (groupID, method, args, options) => {
            return await propertyCall('group', groupID, method, args, options);
        };

        x.group.create = async (host, args) => {
            var response = await callAPI(host, 'group.create', args);
            if (response.status === 'ok') {
                return response.id;
            } else {
                //todo
            }
        };

        let getGroupCryptoKeys = async groupID => {
            var cacheKey = 'groupCryptoKeys/' + groupID;
            if (typeof localCache[cacheKey] === 'undefined') {
                localCache[cacheKey] = await x.services.call('groups', 'getDetails', {
                    groupID: groupID,
                    details: ['administratorsKeys', 'membersKeys']
                });
            }
            return localCache[cacheKey];
        };

        x.group.encrypt = async (groupID, type, text) => {
            var keys = await getGroupCryptoKeys(groupID);
            if (keys === null) {
                throw x.makeAppError('notAMember', 'Not a member!'); // better name
            }
            if (type === 'p') {
                return await x.cryptoData.encrypt(text, x.keyBox.make(keys.administratorsKeys));
            } else if (type === 's') {
                return await x.cryptoData.encrypt(text, x.keyBox.make(keys.membersKeys));
            }
            throw new Error();
        };

        x.group.decrypt = async (groupID, type, text) => {
            var keys = await getGroupCryptoKeys(groupID);
            if (keys === null) {
                throw x.makeAppError('notAMember', 'Not a member!'); // better name
            }
            if (type === 'p') {
                return await x.cryptoData.decrypt(text, x.keyBox.make(keys.administratorsKeys));
            } else if (type === 's') {
                return await x.cryptoData.decrypt(text, x.keyBox.make(keys.membersKeys));
            }
            throw new Error();
        };

    }

    // INBOX

    var processInbox = async () => {
        var dataStorage = getCurrentUserDataStorage();
        var list = await dataStorage.getList({ keyStartWith: 'p/i/d/', keySort: 'asc', limit: 10 });
        //console.log('processInbox - ' + list.length);

        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            var itemKey = item.key;
            var itemValue = x.unpack(item.value);

            if (itemValue.name === '0') { // message from other user
                var usedAccessKey = itemValue.value[0];
                var userID = null;
                var type = null;
                var data2 = null;

                var data = x.unpack(await x.currentUser.decrypt(itemValue.value[1]));
                if (data.name === '') {
                    data = x.unpack(data.value[0]);// check signature
                    if (data.name === '1') {
                        userID = data.value.u; // validate signature
                        type = data.value.t; // validate is list
                        data2 = data.value.d;
                    }
                }

                if (userID !== null) {
                    var resources = {};
                    for (var resourceID of itemValue.value[2]) {
                        resources[resourceID] = itemKey.replace('/d/', '/r/') + '-' + resourceID;
                    }

                    // todo if !connected only type = cc

                    var getUsedAccessKeyDetails = async (accessKey, accessKeys) => {
                        for (var accessKeyToCheck in accessKeys) {
                            if (accessKey === await x.getHash('SHA-512', await x.getHash('SHA-512', accessKeyToCheck))) {
                                return accessKeys[accessKeyToCheck];
                            }
                        }
                        return null;
                    };
                    // todo check user id if matches the access key
                    var accessKeys = await x.services.call('contacts', 'getProvidedAccessKeys');
                    var usedAccessKeyDetails = await getUsedAccessKeyDetails(usedAccessKey, accessKeys);
                    // if (usedAccessKeyDetails === null) {
                    //     var accessKeys = await x.services.call('groups', 'getProvidedAccessKeys');
                    //     usedAccessKeyDetails = await getUsedAccessKeyDetails(usedAccessKey, accessKeys);
                    // }
                    // console.log('processInbox', {
                    //     itemKey: itemKey,
                    //     usedAccessKey: usedAccessKey,
                    //     userID: userID,
                    //     appID: appID,
                    //     data: data2,
                    //     resources: resources,
                    //     usedAccessKeyDetails: usedAccessKeyDetails
                    // });
                    if (usedAccessKeyDetails !== null) {
                        var appsIDs = x.getAppsIDs();
                        for (var i = 0; i < appsIDs.length; i++) {
                            var appID = appsIDs[i];
                            var app = x.getApp(appID);
                            var content = app.inboxJS;
                            if (content !== null) {
                                await x.runTask(appID, content, {
                                    type: type,
                                    sender: userID,
                                    data: data2,
                                    resources: resources,
                                    context: usedAccessKeyDetails // type + additional (id for users and groups)
                                });
                            }
                        }
                    }
                }
                var buffer = dataStorage.getBuffer();
                buffer.delete(itemKey);
                for (var resourceID in resources) {
                    buffer.delete(resources[resourceID]);
                }
                await buffer.flush();
            } else if (itemValue.name === '1') { // notification from a host
                // console.log('processInbox', {
                //     changes: itemValue.value
                // });
                await announcePropertiesChanges([itemValue.value[0]]);
                await dataStorage.delete(itemKey); // todo delete if same content - a new notification may have come while processing
            }
        }
    };


    // TASKS

    x.runTask = (appID, content, args) => {
        return new Promise((resolve, reject) => {
            var contextData = {
                userID: x.currentUser.getID()
            };
            var isServiceWorker = typeof self.serviceWorker !== 'undefined';
            if (isServiceWorker) {
                self.tempppc = async (method, ...args) => {  // todo optimize, concurrency
                    return x.processProxyCall(method, args, { appID: appID, source: 'worker' });
                };
                content = 'var xc=' + JSON.stringify(contextData) + ';var x={};x.proxyCall=self.tempppc;' + x.library.get(['utilities', 'sandboxProxy'], 'x') + content;
            } else {
                content = 'self.xc=' + JSON.stringify(contextData) + ';self.x={};' + x.library.get(['utilities', 'sandboxProxy', 'sandboxWorker'], 'self.x') + 'self.main=(args)=>{' + content + '};';
            }
            if (isServiceWorker) {
                var result = (new Function('args', content))(args);
                Promise.resolve(result)
                    .then(result => {
                        delete self.tempppc;
                        resolve(result);
                    })
                    .catch(e => {
                        reject(e);
                    });
            } else {
                var worker = new Worker(URL.createObjectURL(new Blob([content], { type: 'application/javascript' })));
                var channel = x.createMessagingChannel('window-worker', worker);
                channel.addListener('call', async args => {
                    return await x.processProxyCall(args.method, args.args, { appID: appID, source: 'worker' });
                });
                channel.send('run', args)
                    .then(result => {
                        channel.destroy();
                        worker.terminate();
                        resolve(result);
                    }).catch(e => {
                        reject(e);
                    });
            }
        });
    };

    // SERVICES

    x.services = {};

    x.services.call = async (appID, action, args) => {
        var app = x.getApp(appID);
        var content = app.actions[action];
        return await x.runTask(appID, content, args);
    };


    // APPS

    {

        x.getAppsIDs = () => {
            var result = [];
            var apps = x.library.getApps();
            for (var appID in apps) {
                result.push(appID);
            }
            return result;
        };

        x.getApp = appID => {
            var apps = x.library.getApps();
            if (typeof apps[appID] !== 'undefined') {
                var appData = apps[appID];
                var libraryJS = typeof appData.library !== 'undefined' ? 'var library=(' + appData.library.toString() + ')();' : 'var library={};';
                var propertyObserverJS = typeof appData.propertyObserver !== 'undefined' ? 'return (' + appData.propertyObserver.toString() + ')(args,library);' : '';
                var inboxJS = typeof appData.inbox !== 'undefined' ? 'return (' + appData.inbox.toString() + ')(args,library);' : '';
                var views = {};
                for (var viewID in appData.views) {
                    views[viewID] = libraryJS + 'return (' + appData.views[viewID].toString() + ')(args,library);';
                }
                var actions = {};
                for (var action in appData.actions) {
                    actions[action] = libraryJS + 'return (' + appData.actions[action].toString() + ')(args,library);';
                }
                return { // todo cache
                    name: appData.name,
                    propertyObserverJS: propertyObserverJS !== '' ? libraryJS + propertyObserverJS : null,
                    inboxJS: inboxJS !== '' ? libraryJS + inboxJS : null,
                    views: views,
                    actions: actions
                };
            }
            return null;
        };

    }

    // DEVICE NOTIFICATIONS

    let getNotificationsRegistration = async () => {
        if (Notification !== undefined) {
            if (self.serviceWorker !== undefined) {
                return self.registration;
            }
            if (Notification.permission === 'granted') {
                return await Promise.resolve(navigator.serviceWorker.ready); // never rejects, timeout maybe?
            }
        }
        return null;
    };

    var showDeviceNotification = async (tag, args) => { // always call async
        var registration = await getNotificationsRegistration();
        if (registration === null) {
            return;
        }
        try {
            registration.showNotification(args.title, {
                requireInteraction: true,
                tag: tag,
                body: args.text,
                data: args.clickData,
                //vibrate: [200, 100, 200, 100, 200, 100, 200],
                // todo minify
                badge: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" version="1.1"><switch transform="translate(-47 -53.9)"><g fill="#fff"><path d="M96.5 96.9c-3.6 0-6.5 2.9-6.5 6.5s2.9 6.5 6.5 6.5 6.5-2.9 6.5-6.5-2.9-6.5-6.5-6.5z"/><path d="M49.2 81.9c0 2.3 1.9 4.3 4.3 4.3s4.3-1.9 4.3-4.3-2-4.3-4.4-4.3c-2.4 0-4.2 1.9-4.2 4.3z"/><path d="M62.5 81.9a12.5 12.5 0 1125 0 12.5 12.5 0 01-25 0z"/><path d="M53.5 96.9c-3.6 0-6.5 2.9-6.5 6.5s2.9 6.5 6.5 6.5 6.5-2.9 6.5-6.5-2.9-6.5-6.5-6.5z"/><path d="M53.5 53.9c-3.6 0-6.5 2.9-6.5 6.5s2.9 6.5 6.5 6.5S60 64 60 60.4s-2.9-6.5-6.5-6.5z"/><path d="M96.5 53.9c-3.6 0-6.5 2.9-6.5 6.5s2.9 6.5 6.5 6.5 6.5-2.9 6.5-6.5-2.9-6.5-6.5-6.5z"/><path d="M92.2 81.9c0 2.3 1.9 4.3 4.3 4.3s4.3-1.9 4.3-4.3-2-4.3-4.4-4.3c-2.4 0-4.2 1.9-4.2 4.3z"/><path d="M70.7 60.4c0 2.3 1.9 4.3 4.3 4.3s4.3-1.9 4.3-4.3-2-4.3-4.4-4.3c-2.4 0-4.2 1.9-4.2 4.3z"/><path d="M70.7 103.4c0 2.3 1.9 4.3 4.3 4.3s4.3-1.9 4.3-4.3-2-4.3-4.4-4.3c-2.4 0-4.2 1.9-4.2 4.3z"/></g></switch></svg>'),
                icon: args.image
            });
        } catch (e) {
            // ignore, no permissions, incognito
        }
    };

    var closeDeviceNotifications = async tag => {
        var registration = await getNotificationsRegistration();
        if (registration === null) {
            return;
        }
        try {
            var notifications = await registration.getNotifications({ tag: tag });
            for (var notification of notifications) {
                notification.close();
            }
        } catch (e) {
            // ignore, no permissions, incognito
        }
    };


    // HOST

    x.host = {};

    x.host.call = async (host, method, args, options) => {
        return await callAPI(host, method, args, options);
    };


    // NOTIFICATIONS

    {

        x.notifications = {};

        let getNotificationDataKey = async id => {
            var salt = x.currentUser.getSalt();
            return await x.crypto.deriveID(salt + '$' + id);
        };

        let propertiesMap = {
            id: 'i',
            visible: 'v',
            title: 't',
            text: 'x',
            data: 'd',
            image: 'm',
            onClick: 'o',
            deleteOnClick: 'z',
            date: 'w',
            tags: 'g'
        };

        let parseNotificationRawData = async rawData => {
            var data = x.unpack(await x.currentUser.decrypt(rawData));
            if (data.name === '') {
                var data = data.value;
                var result = {};
                for (var fullProperty in propertiesMap) {
                    var shortProperty = propertiesMap[fullProperty];
                    result[fullProperty] = data[shortProperty] !== undefined ? data[shortProperty] : null;
                }
                if (result.visible === null) {
                    result.visible = false;
                }
                if (result.tags === null) {
                    result.tags = [];
                }
                if (result.date !== null) {
                    result.date = x.parseDateID(result.date);
                }
                return result;
            }
            throw new Error();
        };

        let getNotificationRawData = async notification => {
            var result = {};
            for (var fullProperty in propertiesMap) {
                var shortProperty = propertiesMap[fullProperty];
                if (notification[fullProperty] !== undefined && notification[fullProperty] !== null) {
                    result[shortProperty] = notification[fullProperty];
                }
            }
            return await x.currentUser.encrypt(x.pack('', result));
        };

        let getNotificationsDataStorage = () => {
            return getCurrentUserDataStorage('p/n/'); // notifications
        };

        x.notifications.get = async id => {
            var dataKey = await getNotificationDataKey(id);
            var dataStorage = getNotificationsDataStorage();
            var rawData = await dataStorage.get('n/' + dataKey);
            if (rawData !== null) {
                return await parseNotificationRawData(rawData);
            }
            return null;
        };

        x.notifications.set = async notification => {
            if (notification.id === null) {
                notification.id = x.generateDateBasedID();
            }
            notification.date = x.getDateID(Date.now());
            var dataKey = await getNotificationDataKey(notification.id);
            var dataStorage = getNotificationsDataStorage();
            await dataStorage.set('n/' + dataKey, await getNotificationRawData(notification));
            // console.log('x.notifications.set');
            // console.log(notification);
            var tag = 'x-n-' + dataKey; // todo add user id and close all on logout
            if (notification.visible) {
                var image = null;
                if (notification.image !== null) {
                    var imageType = notification.image.type;
                    var profileImage = null;
                    if (imageType === 'userProfile') {
                        profileImage = await x.services.call('user', 'getProfileImage', { userID: notification.image.id, size: 100 });
                    } else if (imageType === 'groupProfile') {
                        profileImage = await x.services.call('group', 'getProfileImage', { groupID: notification.image.id, size: 100 });
                    }
                    if (profileImage !== null) {
                        try {
                            image = (await x.image.getDetails(await x.image.cropCircle(profileImage))).value;
                        } catch (e) {
                            // ignore in SW problem with canvas
                        }
                    }
                }
                var notificationData = {
                    title: notification.title !== undefined ? notification.title : '',
                    text: notification.text !== undefined ? notification.text : '',
                    clickData: x.notifications.getClickData(notification),
                    image: image
                }
                //console.log(notificationData);
                await showDeviceNotification(tag, notificationData); // todo add to queue at the end of the request or top???
            } else {
                await closeDeviceNotifications(tag); // todo add to queue at the end of the request or top???
            }
            await x.announceChanges(['notifications', 'notifications/' + notification.id]); // add source maybe??
        };

        x.notifications.exists = async id => {
            var dataKey = await getNotificationDataKey(id);
            var dataStorage = getNotificationsDataStorage();
            return await dataStorage.exists('n/' + dataKey);
        };

        x.notifications.delete = async id => {
            var dataKey = await getNotificationDataKey(id);
            var dataStorage = getNotificationsDataStorage();
            await dataStorage.delete('n/' + dataKey);
            // console.log('x.notifications.delete');
            // console.log(id);
            var tag = 'x-n-' + dataKey;
            await closeDeviceNotifications(tag); // todo add to queue at the end of the request or top???
            await x.announceChanges(['notifications', 'notifications/' + id]); // add source maybe??
        };

        x.notifications.getList = async () => {
            var dataStorage = getNotificationsDataStorage();
            var list = await dataStorage.getList({ keyStartWith: 'n/' });
            var result = [];
            for (var i = 0; i < list.length; i++) {
                result.push(await parseNotificationRawData(list[i].value));
            }
            return result;
        };

        x.notifications.make = id => {
            return {
                id: id !== undefined ? id : null,
                visible: false,
                title: null,
                text: null,
                data: null,
                image: null,
                onClick: null,
                deleteOnClick: false,
                date: null
            };
        };

        x.notifications.getClickData = notification => {
            return x.pack('', notification.id);
        };

        x.notifications.onClick = async clickData => {
            // todo check if current user is logged in
            var data = x.unpack(clickData);
            if (data.name === '') {
                var notificationID = data.value;
                var notification = await x.notifications.get(notificationID);
                if (notification !== null) {
                    var onClick = notification.onClick;
                    if (notification.deleteOnClick) {
                        await x.notifications.delete(notification.id);
                    } else {
                        notification.visible = false;
                        await x.notifications.set(notification);
                    }
                    if (onClick !== null) {
                        if (typeof onClick.location !== 'undefined') {
                            x.open(onClick.location, onClick.args);
                        }
                    }
                }
            }
        };

    }


    // PROPERTY OBSERVER

    var getObserverDataStorage = () => {
        return getCurrentUserDataStorage('p/o/'); // observer todo cache
    }

    var checkPropertiesForChanges = async () => {
        //console.log('checkPropertiesForChanges');
        var dataStorage = getObserverDataStorage();
        var lastCheckTimeData = await dataStorage.get('chkt');
        var lastCheckTime = null;
        if (lastCheckTimeData !== null) {
            lastCheckTimeData = x.unpack(await x.currentUser.decrypt(lastCheckTimeData));
            if (lastCheckTimeData.name === '') {
                lastCheckTime = lastCheckTimeData.value;
            }
        }
        var currentTime = Math.floor(Date.now() / 1000);
        if (lastCheckTime === null) {
            lastCheckTime = currentTime - 90 * 86400; // last 90 days
        }
        var keysData = await getPropertiesObserverKeys();
        var hostsKeys = getKeysPerHost(keysData); // todo cycle hosts
        var changes = [];
        for (var host in hostsKeys) {
            try {
                var result = await x.host.call(host, 'host.changes.get', {
                    age: currentTime - lastCheckTime + 60, // 60 just in case
                    keys: hostsKeys[host]
                });
                changes = changes.concat(Object.keys(result));
            } catch (e) {
                if (e.name === 'networkError') {
                    // may be invalid host
                } else {
                    throw e;
                }
            }
        }
        dataStorage.set('chkt', await x.currentUser.encrypt(x.pack('', currentTime)));
        //console.log('checkPropertiesForChanges - ' + host + ' - ' + changes.length);
        //console.table(changes);
        if (changes.length > 0) {
            await announcePropertiesChanges(changes);
        }
    };

    var getPropertiesObserverKeys = async () => {
        var dataStorage = getObserverDataStorage();
        var data = await dataStorage.get('d');
        if (data !== null) {
            data = x.unpack(await x.currentUser.decrypt(data));
            if (data.name === '') {
                var keys = data.value;
            } else {
                throw new Error();
            }
        } else {
            var keys = {};
        }
        return keys;
    };

    var getKeysPerHost = keysData => {
        var result = {};
        for (var key in keysData) {
            var keyParts = key.split('$');
            var parsedID = x.parseID(keyParts[0]);
            if (parsedID !== null) {
                var host = parsedID.host;
                if (typeof result[host] === 'undefined') {
                    result[host] = [];
                }
                result[host].push(keysData[key][0]);
            }
        }
        return result;
    };

    var modifyPropertyObserver = async (action, propertyID, changedKeys, observer) => {
        var dataStorage = getObserverDataStorage();
        var keysData = await getPropertiesObserverKeys();
        // todo check if realy changed
        for (var i = 0; i < changedKeys.length; i++) {
            var key = propertyID + '$' + changedKeys[i];
            if (action === 'add') {
                if (keysData[key] === undefined) {
                    keysData[key] = [await x.getHash('SHA-512-10', key), []];
                }
                keysData[key][1].push(observer);
                keysData[key][1] = x.arrayUnique(keysData[key][1]);
            } else if (action === 'delete') {
                if (keysData[key] !== undefined) {
                    keysData[key][1] = x.removeFromArray(keysData[key][1], observer);
                    if (keysData[key][1].length === 0) {
                        delete keysData[key];
                    }
                }
            }
        }
        if (Object.values(keysData).length === 0) {
            await dataStorage.delete('d');
            await dataStorage.delete('h');
        } else {
            var hostResult = getKeysPerHost(keysData);
            await dataStorage.set('d', await x.currentUser.encrypt(x.pack('', keysData)));
            await dataStorage.set('h', x.pack('', hostResult));
        }
        return true;
    };

    var observePropertyChanges = async (propertyID, keys, observer) => {
        await modifyPropertyObserver('add', propertyID, keys, observer);
    };

    var unobservePropertyChanges = async (propertyID, keys, observer) => {
        await modifyPropertyObserver('delete', propertyID, keys, observer);
    };

    var announcePropertiesChanges = async changedKeys => {
        var keysData = await getPropertiesObserverKeys();
        var taskChanges = [];
        for (var changedKey of changedKeys) {
            for (var fullKey in keysData) {
                var keyData = keysData[fullKey];
                if (changedKey === keyData[0]) {
                    var index = fullKey.indexOf('$');
                    if (index !== -1) {
                        var propertyID = fullKey.substr(0, index);
                        var key = fullKey.substr(index + 1);
                        taskChanges.push({
                            propertyID: propertyID,
                            key: key
                        });
                    }
                }
            }
        }

        if (taskChanges.length > 0) {
            var appsIDs = x.getAppsIDs();
            for (var i = 0; i < appsIDs.length; i++) {
                var appID = appsIDs[i];
                var app = x.getApp(appID);
                var content = app.propertyObserverJS;
                if (content !== null) {
                    await x.runTask(appID, content, {
                        changes: taskChanges
                    });
                }
            }
        }

    };


    // CHANGES

    x.announceChanges = async (keys, options = {}) => {
        // console.log('x.announceChanges');
        // console.log(keys);

        if (keys.indexOf('groups') !== -1 || keys.indexOf('contacts') !== -1) {
            localCache = {}; // temp clear auth cache
        }
        var date = Date.now();
        var changes = [];
        keys.forEach(key => {
            changes.push({ key: key, date: date });
        });
        var event = new CustomEvent('announceChanges', {
            detail: {
                changes: changes,
                source: typeof options.source !== 'undefined' ? options.source : 'window'
            }
        });
        try {
            x.coreEvents.dispatchEvent(event);
        } catch (e) { // temp for ios

        }
        var isServiceWorker = typeof self.serviceWorker !== 'undefined';
        if (isServiceWorker) {
            var allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
            for (var client of allClients) {
                await client.postMessage({ type: 'announceChanges', changes: changes });
            }
        }
    };




    // BACKGROUND TASKS

    x.runBackgroundTasks = async () => {
        //console.log('x.runBackgroundTasks');
        // todo lock
        // todo logged out while running
        if (x.currentUser.isPublic()) {
            try {
                await processInbox();
            } catch (e) {
                if (e.name === 'networkError') {
                    // ignore
                } else {
                    throw e;
                }
            }
        }

        if (x.currentUser.exists()) {
            try {
                await checkPropertiesForChanges();
            } catch (e) {
                if (e.name === 'networkError') {
                    // ignore
                } else {
                    throw e;
                }
            }
        }
    };



    // CACHE

    {
        x.cache = {};

        x.cache.get = namespace => {
            var keyPrefix = '/app.cache/' + namespace + '/';
            var cachePromise = caches.open('dotsmesh-cache');

            var set = async (key, value) => {
                var cache = await Promise.resolve(cachePromise);
                await cache.put(keyPrefix + key, new Response(JSON.stringify(value)));
            };

            var get = async key => {
                var cache = await Promise.resolve(cachePromise);
                var response = await cache.match(keyPrefix + key);
                if (typeof response !== 'undefined') {
                    return JSON.parse(await response.text());
                }
                return null;
            };

            var _delete = async key => {
                var cache = await Promise.resolve(cachePromise);
                await cache.delete(keyPrefix + key);
            };

            var clear = async prefix => {
                var fullPrefix = keyPrefix + (typeof prefix !== 'undefined' ? prefix : '');
                var cache = await Promise.resolve(cachePromise);
                var requests = await cache.keys();
                var promises = [];
                requests.forEach(request => {
                    if (request.url.indexOf(fullPrefix) !== -1) {
                        promises.push(cache.delete(request));
                    }
                });
                await Promise.allSettled(promises);
            };

            // var getContext = name => {
            //     var contextSet = async (key, value) => {
            //         var data = await get(name);
            //         if (data === null) {
            //             data = {};
            //         }
            //         data[key] = value;
            //         await set(name, data);
            //     };

            //     var contextGet = async key => {
            //         var data = await get(name);
            //         if (data !== null && typeof data[key] !== 'undefined') {
            //             return data[key];
            //         }
            //         return null;
            //     };

            //     var contextDelete = async key => {
            //         var data = await get(name);
            //         if (data !== null && typeof data[key] !== 'undefined') {
            //             delete data[key];
            //             await set(name, data);
            //         }
            //     };

            //     var contextClear = async () => {
            //         await _delete(name);
            //     };

            //     return {
            //         set: contextSet,
            //         get: contextGet,
            //         delete: contextDelete,
            //         clear: contextClear
            //     };
            // };

            return {
                set: set,
                get: get,
                delete: _delete,
                clear: clear,
                //getContext: getContext
            };
        };

        x.cache.clear = async () => {
            await caches.delete('dotsmesh-cache');
        }
    }


    //(async () => {
    //var cache = x.cache.get(x.currentUser.getID());
    // console.log(await cache.get('key1'));
    // await cache.set('key1', 'value1');
    // console.log(await cache.get('key1'));
    // await cache.set('key1', 'value2');
    // console.log(await cache.get('key1'));
    // await cache.delete('key1', 'value2');
    // console.log(await cache.get('key1'));
    // await cache.set('key1', 'value3');
    // console.log(await cache.get('key1'));
    // await cache.clear();
    // console.log(await cache.get('key1'));

    // var cacheContext1 = cache.getContext('context1');
    // console.log(await cacheContext1.get('key1'));
    // await cacheContext1.set('key1', 'value1');
    // console.log(await cacheContext1.get('key1'));
    // await cacheContext1.set('key1', 'value2');
    // console.log(await cacheContext1.get('key1'));
    // await cacheContext1.delete('key1', 'value2');
    // console.log(await cacheContext1.get('key1'));
    // await cacheContext1.set('key1', 'value3');
    // console.log(await cacheContext1.get('key1'));
    // await cacheContext1.clear();
    // console.log(await cacheContext1.get('key1'));
    //})();

    // caches is only available in window and service worker, not in workers. Thats why a proxy is needed.
    var localCacheProxyData = [];
    var cacheProxyCall = async (method, args) => {
        var namespace = x.currentUser.getID() + '/' + args[0];
        if (typeof localCacheProxyData[namespace] === 'undefined') {
            localCacheProxyData[namespace] = x.cache.get(namespace);
        }
        var cache = localCacheProxyData[namespace];
        if (method === 'set') {
            return await cache.set(args[1], args[2]);
        } else if (method === 'get') {
            return await cache.get(args[1]);
        } else if (method === 'delete') {
            return await cache.delete(args[1]);
        } else if (method === 'clear') {
            return await cache.clear(args[1]);
        }
        //  else if (method === 'contextSet') {
        //     var context = cache.getContext(args[1]);
        //     return await context.set(args[2], args[3]);
        // } else if (method === 'contextGet') {
        //     var context = cache.getContext(args[1]);
        //     return await context.get(args[2]);
        // } else if (method === 'contextDelete') {
        //     var context = cache.getContext(args[1]);
        //     return await context.delete(args[2]);
        // } else if (method === 'contextClear') {
        //     var context = cache.getContext(args[1]);
        //     return await context.clear(args[2]);
        // }
    };


    x.addProxyCallHandler(options => {
        //var appID = typeof options.appID !== 'undefined' ? options.appID : null;
        var source = typeof options.source !== 'undefined' ? options.source : null;

        return {
            'currentUser.dataStorage': async (prefix, commands) => { // p - private, s - shared
                var dataStorage = getCurrentUserDataStorage(prefix);
                return await dataStorage.execute(commands);
            },
            'currentUser.encrypt': x.currentUser.encrypt,
            'currentUser.decrypt': x.currentUser.decrypt,
            'currentUser.sign': x.currentUser.sign,
            'currentUser.firewall.modify': async modifications => {
                var dataStorage = getCurrentUserDataStorage('p/f/'); // firewall
                var accessKeys = await dataStorage.get('d');
                if (accessKeys !== null) {
                    accessKeys = x.unpack(await x.currentUser.decrypt(accessKeys));
                    if (accessKeys.name === '') {
                        accessKeys = accessKeys.value;
                    } else {
                        throw new Error();
                    }
                } else {
                    var accessKeys = {};
                }
                // todo check if realy changed
                for (var i = 0; i < modifications.length; i++) {
                    var modification = modifications[i];
                    var type = modification.type;
                    var accessKey = modification.accessKey;
                    if (type === 'add') {
                        accessKeys[accessKey] = await x.getHash('SHA-512', await x.getHash('SHA-512', accessKey));
                    } else if (type === 'delete') {
                        if (typeof accessKeys[accessKey] !== 'undefined') {
                            delete accessKeys[accessKey];
                        }
                    }
                }
                var hostResult = Object.values(accessKeys);
                if (hostResult.length === 0) {
                    await dataStorage.delete('d');
                    await dataStorage.delete('h');
                } else {
                    await dataStorage.set('d', await x.currentUser.encrypt(x.pack('', accessKeys)));
                    await dataStorage.set('h', x.pack('', hostResult));
                }
                return true;
            },
            'currentUser.announceChanges': x.currentUser.announceChanges,
            'currentUser.getPrivateProfileDetail': x.currentUser.getPrivateProfileDetail,
            'user.call': x.user.call,
            'user.send': x.user.send,
            'user.getPublicKeys': x.user.getPublicKeys,
            'group.call': x.group.call,
            'group.create': x.group.create,
            'group.encrypt': x.group.encrypt,
            'group.decrypt': x.group.decrypt,
            'group.memberPrivateDataStorage': async (groupID, commands) => {
                var salt = x.currentUser.getSalt();
                var dataKey = await x.crypto.deriveID(salt + '$' + groupID);
                var dataStorage = getCurrentUserDataStorage('p/g/p/' + dataKey + '/');
                return await dataStorage.execute(commands);
            },
            'announceChanges': keys => {
                var options = {};
                if (source !== null) {
                    options.source = source;
                }
                x.announceChanges(keys, options);
            },
            'property.observeChanges': observePropertyChanges,
            'property.unobserveChanges': unobservePropertyChanges,
            'services.call': x.services.call,
            'image.resize': async (image, width, height, quality) => {
                return await x.image.resize_(image, width, height, quality);
            },
            // 'image.cropCircle': async image => {
            //     return await x.image.cropCircle(image);
            // },
            'cache._set': (...args) => { return cacheProxyCall('set', args) },
            'cache._get': (...args) => { return cacheProxyCall('get', args) },
            'cache._delete': (...args) => { return cacheProxyCall('delete', args) },
            'cache._clear': (...args) => { return cacheProxyCall('clear', args) },
            // 'cache.contextSet': (...args) => { return cacheProxyCall('contextSet', args) },
            // 'cache.contextGet': (...args) => { return cacheProxyCall('contextGet', args) },
            // 'cache.contextDelete': (...args) => { return cacheProxyCall('contextDelete', args) },
            // 'cache.contextClear': (...args) => { return cacheProxyCall('contextClear', args) },
            'cache.clear': x.cache.clear,
            'notifications.get': x.notifications.get,
            'notifications.set': x.notifications.set,
            'notifications.exists': x.notifications.exists,
            'notifications.delete': x.notifications.delete,
            'notifications.getList': x.notifications.getList,
            'notifications.make': x.notifications.make,
            'notifications.getClickData': x.notifications.getClickData,
            'notifications.onClick': x.notifications.onClick,
        };
    });


    // (async () => {
    //     var image = await x.image.make(x.getDefaultUserImage('x'), 100, 100, 1)
    //     console.log(image);
    //     image = (await x.image.getDetails(await x.image.cropCircle(image))).value;
    //     console.log(image);
    // })();

}