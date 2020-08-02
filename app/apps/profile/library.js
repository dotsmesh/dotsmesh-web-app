
() => {

    var getDataStorage = async (propertyType, propertyID) => {
        if (propertyType === 'user') {
            if (propertyID !== x.currentUser.getID()) {
                throw new Error();
            }
            return {
                privateDataStorage: x.currentUser.getDataStorage('p/p/'),
                sharedDataStorage: x.currentUser.getDataStorage('s/p/'),
                encryptPrivateFunction: x.currentUser.encrypt,
                decryptPrivateFunction: x.currentUser.decrypt,
                prepareSharedFunction: async value => {
                    return x.pack('', [value, await x.currentUser.sign(value)]);
                }
            };
        } else if (propertyType === 'group') {
            return {
                privateDataStorage: await x.group.getFullDataStorage(propertyID, 'p/p/'),
                sharedDataStorage: await x.group.getSharedDataStorage(propertyID, 'p/'),
                encryptPrivateFunction: async data => {
                    return await x.group.encryptPrivate(propertyID, data);
                },
                decryptPrivateFunction: async data => {
                    return await x.group.decryptPrivate(propertyID, data)
                },
                prepareSharedFunction: async data => {
                    return await x.group.encryptShared(propertyID, data);
                }
            };
        } else if (propertyType === 'groupMember') {
            var parts = propertyID.split('$');
            var groupID = parts[0];
            //var userID = parts[1];
            return {
                privateDataStorage: await x.group.getCurrentMemberPrivateDataStorage(groupID).getContext('p/'),
                sharedDataStorage: await x.group.getCurrentMemberSharedDataStorage(groupID, 'p/'),
                encryptPrivateFunction: x.currentUser.encrypt,
                decryptPrivateFunction: x.currentUser.decrypt,
                prepareSharedFunction: async data => {
                    return await x.group.encryptShared(groupID, data);
                }
            };
        } else {
            throw new Error();
        }
    };

    var getData = async (propertyType, propertyID) => {
        var ds = await getDataStorage(propertyType, propertyID);
        var data = await ds.privateDataStorage.get('d');
        if (data === null) {
            data = {};
        } else {
            data = x.unpack(await ds.decryptPrivateFunction(data));
            if (data.name === '') {
                data = data.value;
            }
        }

        var result = {};
        result.image = data.i !== undefined ? data.i : null;
        result.name = data.n !== undefined ? data.n : null;
        result.description = data.d !== undefined ? data.d : null;
        result.imageSizes = data.s !== undefined ? data.s : [];
        return result;
    };

    var setData = async (propertyType, propertyID, data) => {
        var ds = await getDataStorage(propertyType, propertyID);
        var oldData = await getData(propertyType, propertyID);
        var image = data.image !== undefined && data.image !== null ? await x.image.resize(data.image, 600, 600) : null;
        var name = data.name !== undefined && data.name !== null && data.name.length > 0 ? data.name : null;
        var description = data.description !== undefined && data.description !== null && data.description.length > 0 ? data.description : null;
        var imageSizes = [40, 50, 60, 80, 100, 120, 150, 200, 600];

        var privateData = {};
        var sharedData = {};
        if (image !== null) {
            privateData.i = image;
            privateData.s = imageSizes;
            sharedData.s = imageSizes;
        }
        if (name !== null) {
            privateData.n = name;
            sharedData.n = name;
        }
        if (description !== null) {
            privateData.d = description;
            sharedData.d = description;
        }

        if (JSON.stringify(privateData) === '{}') {
            await ds.privateDataStorage.delete('d');
        } else {
            await ds.privateDataStorage.set('d', await ds.encryptPrivateFunction(x.pack('', privateData)));
        }

        var buffer = ds.sharedDataStorage.getBuffer();

        if (oldData.image !== image || JSON.stringify(oldData.imageSizes) !== JSON.stringify(imageSizes)) {
            for (var i = 0; i < imageSizes.length; i++) {
                var size = imageSizes[i];
                var dataKey = 'i' + size;
                if (image === null) {
                    buffer.delete(dataKey);
                } else {
                    var resizedImage = await x.image.resize(image, size, size, 92);
                    buffer.set(dataKey, await ds.prepareSharedFunction(resizedImage));
                }
            }
        }

        //sharedData.v = x.generateVersion();


        if (JSON.stringify(sharedData) === '{}') {
            buffer.delete('d');
        } else {
            buffer.set('d', await ds.prepareSharedFunction(x.pack('', sharedData)));
        }

        await buffer.flush();

        await x.property.clearProfileCache(propertyType, propertyID);
        await x.announceChanges([propertyType + '/' + propertyID + '/profile']);
    };

    return {
        getData: getData,
        setData: setData
    };
};