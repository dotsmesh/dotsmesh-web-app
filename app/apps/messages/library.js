/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

() => {

    var dataStorageCache = null;
    var getDataStorage = () => {
        if (dataStorageCache === null) {
            dataStorageCache = x.currentUser.getDataStorage('p/m/');
        }
        return dataStorageCache;
    };

    let threadsCache = null;
    var getThreads = async () => {
        if (threadsCache === null) {
            var dataStorage = getDataStorage();
            var threads = await dataStorage.get('a');
            if (threads !== null) {
                var data = x.unpack(await x.currentUser.decrypt(threads));
                if (data.name === '') {
                    threadsCache = data.value;
                } else {
                    throw new Error();
                }
            } else {
                threadsCache = {};
            }
        }
        return threadsCache;
    };

    var getOrMakeThreadID = async recipientIDs => {
        var dataStorage = getDataStorage();
        var currentUserID = x.currentUser.getID();
        recipientIDs = x.removeFromArray(recipientIDs, currentUserID);
        recipientIDs = x.arrayUnique(recipientIDs);
        if (recipientIDs.length === 0) {
            throw new Error();
        }
        var threads = await getThreads();
        var threadIDs = [];
        for (var threadID in threads) {
            var recipients = threads[threadID];
            if (recipients.length > 0) {
                var allFound = true;
                for (var i in recipientIDs) {
                    if (recipients.indexOf(recipientIDs[i]) === -1) {
                        allFound = false;
                        break;
                    }
                }
                if (allFound) {
                    return threadID;
                }
            }
            threadIDs.push(threadID);
        }
        var threadID = await x.generateOtherUniqueID(threadIDs);
        threads[threadID] = recipientIDs;
        await dataStorage.set('a', await x.currentUser.encrypt(x.pack('', threads)));
        threadsCache = null;
        return threadID;
    };

    var getThreadRecipients = async threadID => {
        var threads = await getThreads();
        if (typeof threads[threadID] !== 'undefined') {
            return threads[threadID];
        }
        throw new Error();
    };

    // var getLatestStorage = () => {
    //     return getDataStorage().getOrderedListContext('l/');
    // };

    var addIncomingMessage = async (threadID, message, onChange) => {
        if (message.resourcesIDs.length > 0) {
            var dataStorage = x.currentUser.getDataStorage();
            var buffer = dataStorage.getBuffer();
            for (var resourceID of message.resourcesIDs) {
                if (args.resources[resourceID] !== null) {
                    buffer.duplicate(args.resources[resourceID], 'p/m/r/' + threadID + '/' + resourceID);
                }
            }
            await buffer.flush();
        }
        await addMessage(threadID, message);
    };

    var addMessage = async (threadID, message, onChange = null) => {
        var hasOnChange = onChange !== null;
        var callOnChange = async message => {
            await onChange(await message.clone());
        }
        var dataStorage = getDataStorage();
        var currentUserID = x.currentUser.getID();
        if (message.id === null) {
            message.id = x.generateDateBasedID();
        }
        if (hasOnChange) {
            message.data.t = { // tasks
                s: null //save
            };
        }
        var currentUserIsTheSender = message.userID === currentUserID;
        var recipients = currentUserIsTheSender ? await library.getThreadRecipients(threadID) : [];
        if (hasOnChange) {
            recipients.forEach(recipientID => {
                message.data.t['r-' + recipientID] = null;
            });
            await callOnChange(message);
        }
        var messageDataKey = 't/' + threadID + '/' + message.id;
        try {
            var messageToSave = await message.clone();
            if (hasOnChange) {
                delete messageToSave.data.t.s; // clear task data for the saved message
            }
            var serializedMessageToSave = await messageToSave.pack();
            var buffer = dataStorage.getBuffer();
            buffer.set(messageDataKey, await x.currentUser.encrypt(serializedMessageToSave.value));
            for (var resourceID in serializedMessageToSave.resourcesToSave) {
                buffer.set('r/' + threadID + '/' + resourceID, await x.currentUser.encrypt(x.pack('', serializedMessageToSave.resourcesToSave[resourceID])));
            }
            // var latestDataStorage = getLatestStorage(); // todo add to buffer
            // await latestDataStorage.set(threadID, {
            //     u: messageToSave.userID !== currentUserID, // unread
            //     i: messageToSave.id, // message id
            //     v: serializedMessageToSave.value // message json
            // }, { buffer: buffer });
            await buffer.flush();
            if (hasOnChange) {
                delete message.data.t.s; // delete save task
                //throw new Error('Error saving!');
            }
        } catch (e) {
            if (hasOnChange) {
                message.data.t.s = e.message; // save error
                // todo
            } else {
                throw e;
            }
        };
        if (hasOnChange) {
            await callOnChange(message);
        }

        if (recipients.length > 0) {
            var messageToSend = await message.clone();
            if (hasOnChange) {
                delete messageToSend.data.t; // clear task data for the sent messages
            }
            var serializedMessageToSend = await messageToSend.pack();
            var promisesToWait = [];
            recipients.forEach(recipientID => {
                var dataToSend = {
                    i: messageToSave.id,
                    v: serializedMessageToSend.value,
                    o: (recipients.length === 1 ? [] : recipients)
                };
                promisesToWait.push(x.user.send('mm', recipientID, x.pack('m', dataToSend), serializedMessageToSend.resourcesToSave));
            });
            var results = await Promise.allSettled(promisesToWait);
            recipients.forEach((recipientID, index) => {
                var result = results[index];
                if (result.status === "fulfilled") {
                    if (hasOnChange) {
                        delete message.data.t['r-' + recipientID];
                    }
                } else if (result.status === 'rejected') {
                    if (hasOnChange) {
                        message.data.t['r-' + recipientID] = x.pack('', result.reason);
                    }
                }
            });
            if (hasOnChange) {
                if (x.isEmptyObject(message.data.t)) {
                    delete message.data.t;
                }
                var messageToSave = await message.clone();
                var serializedMessageToSave = await messageToSave.pack();
                await dataStorage.set(messageDataKey, await x.currentUser.encrypt(serializedMessageToSave.value)); // todo what if this fails ??
                await callOnChange(message);
            }
        }
        await x.announceChanges(['messages']);
        if (!currentUserIsTheSender) {
            var profile = await x.user.getProfile(message.userID);
            await x.announceChanges(['messages/' + threadID]);
            var notification = await x.notifications.make('m$' + threadID);
            notification.visible = true;
            notification.title = 'Message from ' + profile.name;
            notification.text = message.text;
            notification.image = { type: 'userProfile', id: message.userID };
            notification.onClick = { location: 'messages/thread', args: { threadID: threadID } };
            notification.tags = ['m'];
            await x.notifications.set(notification);
        }
    };

    // var setLastSeenMessage = async (threadID, message) => {
    //     return;// todo
    //     var serializedMessage = await message.pack();
    //     var storage = getLatestStorage();
    //     await storage.set(threadID, {
    //         u: false,
    //         i: message.id,
    //         v: serializedMessage.value
    //     }, {
    //         date: message.date
    //     });
    //     await x.announceChanges(['messages/latest']);
    // };

    var unserializeMessage = (threadID, id, json) => {
        return x.posts.unpack(id, json, async (post, resourceID) => {
            var dataStorage = getDataStorage();
            var value = await dataStorage.get('r/' + threadID + '/' + resourceID);
            if (value !== null) {
                value = x.unpack(await x.currentUser.decrypt(value));
                if (value.name === '') { // saved by the current user
                    return value.value;
                } else if (value.name === 'x') { // sent by other user
                    return value.value;
                }
            }
            return null;
        });
    };

    var getLatestThreads = async () => {
        // var storage = getLatestStorage();
        // var items = await storage.getList();
        // if (items.length === 0) {
        //     return [];
        // }
        var dataStorage = getDataStorage();
        var threads = await getThreads();
        var threadsIDs = Object.keys(threads);
        var result = [];
        for (var i = 0; i < threadsIDs.length; i++) {
            var threadID = threadsIDs[i];
            var list = await dataStorage.getList({ keyStartWith: 't/' + threadID + '/', keySort: 'desc', limit: 1 });
            var message = null;
            if (list[0] !== undefined) {
                message = unserializeMessage(threadID, list[0].key, await x.currentUser.decrypt(list[0].value));
            }
            result.push({
                id: threadID,
                otherParticipantsIDs: threads[threadID],
                message: message
            });
            // var messageData = item.value;
            // var message = unserializeMessage(threadID, messageData.i, messageData.v);
            // var otherParticipantsIDs = typeof threads[threadID] === 'undefined' ? [] : threads[threadID];
            // result.push({
            //     id: threadID,
            //     otherParticipantsIDs: otherParticipantsIDs,
            //     senderID: message.userID,
            //     text: message.text,
            //     date: message.date,
            //     unread: messageData.u
            // });
        }
        return result;
    };

    var getThreadMessages = async (threadID, listOptions) => {
        var dataStorage = getDataStorage().getContext('t/' + threadID + '/');
        var list = await dataStorage.getList(listOptions);
        var messages = [];
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            messages.push(unserializeMessage(threadID, item.key, await x.currentUser.decrypt(item.value)));
        }
        return messages;
    };

    return {
        getOrMakeThreadID: getOrMakeThreadID,
        addMessage: addMessage,
        addIncomingMessage: addIncomingMessage,
        getLatestThreads: getLatestThreads,
        getThreadRecipients: getThreadRecipients,
        getThreadMessages: getThreadMessages,
        //setLastSeenMessage: setLastSeenMessage
    }
}