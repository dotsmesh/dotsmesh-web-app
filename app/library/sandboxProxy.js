/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

(x) => {

    // ERROR HANDLING

    x.sandboxEvents = x.makeEventTarget();

    var handleError = e => {
        var error = x.makeAppError(e);
        var event = new CustomEvent('error', {
            cancelable: true,
            detail: {
                error: error
            }
        });
        x.sandboxEvents.dispatchEvent(event);
        if (event.defaultPrevented) {
            return;
        }
        x.proxyCall('error', JSON.stringify(error));
    };
    self.addEventListener('error', e => {
        e.preventDefault();
        handleError(e);
    });
    self.addEventListener('unhandledrejection', e => {
        e.preventDefault();
        handleError(e);
    });


    // CURRENT USER
    {

        x.currentUser = {};

        x.currentUser.encrypt = text => {
            return x.proxyCall('currentUser.encrypt', text);
        };

        x.currentUser.decrypt = text => {
            return x.proxyCall('currentUser.decrypt', text);
        };

        x.currentUser.sign = text => {
            return x.proxyCall('currentUser.sign', text);
        };

        x.currentUser.getID = () => {
            return xc.userID;
            // todo cache
            //return x.proxyCall('currentUser.getID');
        };

        x.currentUser.exists = () => {
            return xc.userID !== null;
            // todo cache
            //return x.proxyCall('currentUser.getID');
        };

        x.currentUser.isPrivate = () => {
            if (xc.userID !== null) {
                return x.isPrivateID(xc.userID);
            }
            return false;
        };

        x.currentUser.isPublic = () => {
            if (xc.userID !== null) {
                return !x.isPrivateID(xc.userID);
            }
            return false;
        };

        x.currentUser.getFirewall = () => {
            return {
                add: async accessKey => {
                    return await x.proxyCall('currentUser.firewall.modify', [{ type: 'add', accessKey: accessKey }]);
                },
                delete: async accessKey => {
                    return await x.proxyCall('currentUser.firewall.modify', [{ type: 'delete', accessKey: accessKey }]);
                }
            };
        };

        x.currentUser.announceChanges = async keys => {
            await x.proxyCall('currentUser.announceChanges', keys);
        };

        x.currentUser.logout = () => {
            return x.proxyCall('currentUser.logout');
        };

        x.currentUser.setNewPassword = (oldPassword, newPassword) => {
            return x.proxyCall('currentUser.setNewPassword', oldPassword, newPassword);
        };

        x.requireUser = context => {
            return x.proxyCall('requireUser', context);
        };

        x.currentUser.getPrivateProfileDetail = async key => {
            return x.proxyCall('currentUser.getPrivateProfileDetail', key);
        };

        x.currentUser.getDataStorage = (prefix = '') => {
            return x.dataStorage.get(async commands => {
                return x.proxyCall('currentUser.dataStorage', prefix, commands);
            });
        };

        x.currentUser.enableDeviceNotifications = async () => {
            return x.proxyCall('currentUser.enableDeviceNotifications');
        };

        x.currentUser.disableDeviceNotifications = async () => {
            return x.proxyCall('currentUser.disableDeviceNotifications');
        };

        x.currentUser.getDeviceNotificationsStatus = async () => {
            return x.proxyCall('currentUser.getDeviceNotificationsStatus');
        };

    }


    // CACHE

    {
        x.cache = {};

        x.cache.get = namespace => {
            return {
                set: async (key, value) => {
                    return await x.proxyCall('cache._set', namespace, key, value);
                },
                get: async key => {
                    return await x.proxyCall('cache._get', namespace, key);
                },
                delete: async key => {
                    return await x.proxyCall('cache._delete', namespace, key);
                },
                clear: async prefix => {
                    if (typeof prefix === 'undefined') {
                        prefix = '';
                    }
                    return await x.proxyCall('cache._clear', namespace, prefix);
                }
                // getContext: name => {
                //     return {
                //         set: async (key, value) => {
                //             return await x.proxyCall('cache.contextSet', namespace, name, key, value);
                //         },
                //         get: async key => {
                //             return await x.proxyCall('cache.contextGet', namespace, name, key);
                //         },
                //         delete: async key => {
                //             return await x.proxyCall('cache.contextDelete', namespace, name, key);
                //         },
                //         clear: async prefix => {
                //             if (typeof prefix === 'undefined') {
                //                 prefix = '';
                //             }
                //             return await x.proxyCall('cache.contextClear', namespace, name, prefix);
                //         }
                //     };
                // }
            };
        };

        x.cache.clear = async prefix => {
            if (typeof prefix === 'undefined') {
                prefix = '';
            }
            await x.proxyCall('cache.clear', prefix);
        };
    }


    // USERS

    {

        x.user = {};

        x.user.call = async (userID, method, args, options) => {
            return await x.proxyCall('user.call', userID, method, args, options);
        };

        x.user.send = async (type, userID, data, resources, options) => {
            return await x.proxyCall('user.send', type, userID, data, resources, options);
        };

        x.user.getProfile = (userID) => {
            return x.property.getProfile('user', userID);
        };

        x.user.getSharedDataStorage = userID => {
            return x.dataStorage.get(async commands => {
                //console.table(commands);
                return x.user.call(userID, 'user.dataStorage', {
                    type: 's',
                    commands: commands
                }, { auth: 'auto' });
            });
        };

        x.user.getPublicKeys = async userID => {
            return await x.proxyCall('user.getPublicKeys', userID);
        };

    }


    // GROUPS

    {

        x.group = {};

        x.group.call = async (groupID, method, args, options) => {
            return await x.proxyCall('group.call', groupID, method, args, options);
        };

        x.group.create = async (host, data) => {
            return await x.proxyCall('group.create', host, data);
        };

        x.group.getProfile = async (groupID) => {
            return x.property.getProfile('group', groupID);
        };

        x.group.encryptPrivate = async (groupID, text) => {
            return x.proxyCall('group.encrypt', groupID, 'p', text);
        };

        x.group.decryptPrivate = async (groupID, text) => {
            return x.proxyCall('group.decrypt', groupID, 'p', text);
        };

        x.group.encryptShared = async (groupID, text) => {
            return x.proxyCall('group.encrypt', groupID, 's', text);
        };

        x.group.decryptShared = async (groupID, text) => {
            return x.proxyCall('group.decrypt', groupID, 's', text);
        };

        let getDataStorage = (type, groupID, prefix = '', args = {}) => {
            args.type = type;
            return x.dataStorage.get(async commands => {
                args.commands = commands;
                return await x.group.call(groupID, 'group.dataStorage', args, { auth: 'auto' });
            }, prefix);
        };

        x.group.getFullDataStorage = (groupID, prefix) => {
            return getDataStorage('f', groupID, prefix);
        };

        x.group.getSharedDataStorage = (groupID, prefix) => {
            return getDataStorage('s', groupID, prefix);
        };

        x.group.getCurrentMemberPrivateDataStorage = groupID => {
            return x.dataStorage.get(async commands => {
                return x.proxyCall('group.memberPrivateDataStorage', groupID, commands);
            });
        };

        x.group.getCurrentMemberSharedDataStorage = (groupID, prefix) => {
            return getDataStorage('mf', groupID, prefix);
        };

        x.group.getMemberSharedDataStorage = (groupID, memberID, prefix) => {
            args = {};
            args.dataMemberID = memberID;
            return getDataStorage('ms', groupID, prefix, args);
        };




    }



    // CHANGES

    x.sandboxEvents = x.makeEventTarget();

    x.announceChanges = async keys => {
        var event = new CustomEvent('announceChanges', {
            detail: {
                keys: keys
            }
        });
        x.sandboxEvents.dispatchEvent(event);
        await x.proxyCall('announceChanges', keys);
    };


    // SERVICES

    x.services = {};

    x.services.call = async (appID, action, args = {}) => {
        return await x.proxyCall('services.call', appID, action, args);
    };


    // POSTS UTILITIES

    x.posts = {};

    x.posts.makeFromRaw = async (propertyType, propertyID, id, json) => {
        var post = await x.posts.unpack(id, json, async (post, resourceID) => {
            return await x.services.call('posts', 'getPostResource', { propertyType: propertyType, propertyID: propertyID, postID: post.id, resourceID: resourceID });
        });
        if (propertyType === 'group') {
            post.groupID = propertyID;
        }
        return post;
    };

    x.posts.makeFromRawList = async (propertyType, propertyID, posts) => {
        var result = [];
        for (var id in posts) {
            var post = await x.posts.makeFromRaw(propertyType, propertyID, id, posts[id]);
            if (propertyType === 'group') {
                post.groupID = propertyID;
            }
            result.push(post);
        }
        return result;
    };

    x.posts.make = () => {
        var attachments = [];
        var post = {};
        post.id = null;
        post.date = null;
        post.userID = null;
        post.text = '';
        post.textType = '';
        post.data = {};
        post.resourcesIDs = [];
        post.getResource = null;
        post.attachments = {
            add: attachment => {
                if (attachment.id === null) {
                    attachment.id = x.generateID();
                }
                attachments.push(attachment);
            },
            get: attachmentID => {
                for (var i = 0; i < attachments.length; i++) {
                    if (attachments[i].id === attachmentID) {
                        return attachments[i];
                    }
                }
                return null;
            },
            delete: attachmentID => {
                var temp = [];
                for (var i = 0; i < attachments.length; i++) {
                    if (attachments[i].id !== attachmentID) {
                        temp.push(attachments[i]);
                    }
                }
                attachments = temp;
            },
            deleteAll: () => {
                attachments = [];
            },
            getIDs: () => {
                var result = [];
                for (var i = 0; i < attachments.length; i++) {
                    result.push(attachments[i].id);
                }
                return result;
            },
            getCount: () => {
                return attachments.length;
            }
        };
        post.pack = async () => {
            if (post.date === null) {
                throw new Error('The post date should not be empty!');
            }
            if (post.userID === null) {
                throw new Error('The post userID should not be empty!');
            }
            var resourcesToSave = {};
            var resourcesToDelete = {};
            var resourcesIDs = [];
            var data = {};
            data.d = x.getDateID(post.date);
            data.u = post.userID;
            if (post.text.length > 0) {
                data.t = post.text;
            }
            if (post.textType.length > 0) {
                data.y = post.textType;
            }
            if (!x.isEmptyObject(post.data)) {
                data.x = post.data;
            }
            if (attachments.length > 0) {
                data.a = [];
                for (var i = 0; i < attachments.length; i++) {
                    var attachment = attachments[i];
                    if (attachment.id === null) {
                        throw new Error('The attachment ID should not be empty!');
                    }
                    var serializedAttachment = await attachment.pack();
                    data.a.push(x.pack('', [attachment.id, serializedAttachment.value]));
                    if (serializedAttachment.hasResource) {
                        resourcesIDs.push(attachment.id);
                    }
                    if (serializedAttachment.resourceToSave !== null) {
                        resourcesToSave[attachment.id] = serializedAttachment.resourceToSave;
                    }
                }
            }
            if (resourcesIDs.length > 0) {
                data.r = resourcesIDs;
            }
            var resourcesToDelete = post.resourcesIDs.filter(resourceID => !resourcesIDs.includes(resourceID));
            return {
                value: x.pack('', data),
                resourcesIDs: resourcesIDs,
                resourcesToSave: resourcesToSave,
                resourcesToDelete: resourcesToDelete
            };
        };
        post.clone = async () => {
            var result = x.posts.make();
            result.id = post.id;
            result.date = post.date;
            result.userID = post.userID;
            result.text = post.text;
            result.textType = post.textType;
            result.data = x.deepCopyObject(post.data);
            for (var i = 0; i < attachments.length; i++) {
                result.attachments.add(await attachments[i].clone());
            }
            return result;
        };
        return post;
    };

    // (async () => {
    //     var post = x.posts.make();
    //     post.id = '111111';
    //     post.date = 'ddd';
    //     post.userID = 'uuu';
    //     var attachment = x.attachment.make();
    //     attachment.type = 'image';
    //     attachment.value = await x.image.make('data:xxxxxxxxxxx', 10, 10, 10);
    //     post.attachments.add(attachment);
    //     post.data.vvvv = 'xxxx';
    //     var post2 = await post.clone();
    //     delete post2.data.vvvv;
    //     console.log(post2);
    //     console.log(await post.serialize());
    //     console.log(await post2.serialize());
    //     //post2.data.vvvv = 'eeee';
    // })();

    x.posts.unpack = (id, value, getResourceFunction) => {
        var data = x.unpack(value);
        if (data.name === '') {
            data = data.value;
        } else {
            throw new Error();
        }
        var post = x.posts.make();
        post.id = id;
        if (typeof data.d !== 'undefined') {
            post.date = x.parseDateID(data.d);
        }
        if (typeof data.u !== 'undefined') {
            post.userID = data.u;
        }
        if (typeof data.t !== 'undefined') {
            post.text = data.t;
        }
        if (typeof data.y !== 'undefined') {
            post.textType = data.y;
        }
        if (typeof data.r !== 'undefined') {
            post.resourcesIDs = data.r;
        }
        if (typeof data.x !== 'undefined') {
            post.data = data.x;
        }
        if (typeof data.a !== 'undefined') {
            for (var i = 0; i < data.a.length; i++) {
                var attachmentData = x.unpack(data.a[i]);
                if (attachmentData.name === '') {
                    attachmentDataValue = attachmentData.value;
                    var attachment = x.attachment.unpack(attachmentDataValue[0], attachmentDataValue[1], async (attachment) => {
                        return await post.getResource(attachment.id);
                    });
                    post.attachments.add(attachment);
                } else {
                    throw new Error();
                }
            }
        }
        post.getResource = async resourceID => {
            return await getResourceFunction(post, resourceID);
        };
        return post;
    };


    // ALERTS

    // {

    //     x.alerts = {};

    //     x.alerts.add = async (typedID, key, data) => {
    //         return await x.proxyCall('alerts.add', typedID, key, data);
    //     };

    //     x.alerts.exists = async (typedID, key) => {
    //         return await x.proxyCall('alerts.exists', typedID, key);
    //     };

    //     x.alerts.getData = async (typedID, key) => {
    //         return await x.proxyCall('alerts.getData', typedID, key);
    //     };

    //     x.alerts.setData = async (typedID, key, data) => {
    //         return await x.proxyCall('alerts.setData', typedID, key, data);
    //     };

    //     x.alerts.delete = async (typedID, key) => {
    //         return await x.proxyCall('alerts.delete', typedID, key);
    //     };

    // }

    // NOTIFICATIONS

    x.notifications = {};

    x.notifications.get = async id => {
        return await x.proxyCall('notifications.get', id);
    };

    x.notifications.set = async notification => {
        return await x.proxyCall('notifications.set', notification);
    };

    x.notifications.exists = async id => {
        return await x.proxyCall('notifications.exists', id);
    };

    x.notifications.delete = async id => {
        return await x.proxyCall('notifications.delete', id);
    };

    x.notifications.getList = async () => {
        return await x.proxyCall('notifications.getList');
    };

    x.notifications.make = async id => {
        return await x.proxyCall('notifications.make', id);
    };

    x.notifications.getClickData = async notification => {
        return await x.proxyCall('notifications.getClickData', notification);
    };

    x.notifications.onClick = async clickData => {
        return await x.proxyCall('notifications.onClick', clickData);
    };



    // PROPERTY

    {
        x.property = {};

        var profilesCache = x.cache.get('profiles');

        x.property.getProfile = async (type, id) => {
            if (type === 'groupMember') {
                var [groupID, userID] = id.split('$');
                if (x.isPublicID(userID)) {
                    type = 'user';
                    id = userID;
                }
            }
            if (type === 'user') {
                var dataStorage = x.user.getSharedDataStorage(id).getContext('p/');
            } else if (type === 'group') {
                var dataStorage = x.group.getSharedDataStorage(id).getContext('p/');
            } else if (type === 'groupMember') {
                var [groupID, userID] = id.split('$');
                var memberID = await x.groups.getMemberID(groupID, userID);
                var dataStorage = x.group.getMemberSharedDataStorage(groupID, memberID).getContext('p/');
            } else {
                throw new Error();
            }

            var getData = async key => {
                try {
                    var cacheKey = type + '-' + id;
                    var data = await profilesCache.get(cacheKey);
                    data = data === null ? {} : data;
                    if (data[key] === undefined) {
                        try {
                            if (type === 'user' && x.isPrivateID(id)) {
                                if (id === x.currentUser.getID()) {
                                    data[key] = await x.currentUser.getPrivateProfileDetail(key);
                                } else {
                                    data[key] = null;
                                }
                            } else {
                                data[key] = await dataStorage.get(key);
                            }
                        } catch (e) {
                            if (['userNotFound', 'invalidUserID', 'groupNotFound', 'invalidGroupID', 'invalidAccessKey', 'invalidMemberID', 'memberNotFound'].indexOf(e.name) !== -1) {
                                data[key] = null;
                            } else {
                                throw e;
                            }
                        }
                        await profilesCache.set(cacheKey, data);
                    }
                    return data[key];
                } catch (e) {
                    if (e.name === 'networkError') {
                        return null;
                    } else {
                        throw e;
                    }
                }
            };
            if (id === null) {
                var data = null;
            } else {
                var data = await getData('d');
            }

            var exists = true;
            if (data === null) {
                data = {};
                exists = false;
            } else {
                if (type === 'user') {
                    data = x.unpack(data);
                    if (data.name === '') {
                        //data.value[1] // todo verify signature 
                        data = x.unpack(data.value[0]);
                        if (data.name === '') {
                            data = data.value;
                        } else {
                            throw new Error();
                        }
                    } else {
                        throw new Error();
                    }
                } else if (type === 'group') {
                    try {
                        data = x.unpack(await x.group.decryptShared(id, data));
                        if (data.name === '') {
                            data = data.value;
                        } else {
                            throw new Error();
                        }
                    } catch (e) {
                        if (e.name === 'notAMember') {
                            data = {};
                        } else {
                            throw e;
                        }
                    }
                } else if (type === 'groupMember') {
                    try {
                        var [groupID, userID] = id.split('$');
                        data = x.unpack(await x.group.decryptShared(groupID, data));
                        if (data.name === '') {
                            data = data.value;
                        } else {
                            throw new Error();
                        }
                    } catch (e) {
                        if (e.name === 'notAMember') {
                            data = {};
                        } else {
                            throw e;
                        }
                    }
                } else {
                    throw new Error();
                }
            }

            var imageSizes = typeof data.s !== 'undefined' ? data.s : [];

            var name = typeof data.n !== 'undefined' ? data.n : null;
            if (name === null || name.length === 0) {
                name = 'Unknown';
            }
            //name = 'Missing';

            var description = typeof data.d !== 'undefined' ? data.d : null;
            if (description === null) {
                description = '';
            }

            return {
                exists: exists,
                name: name,
                description: description,
                //links: [],
                getImage: async size => {
                    if (imageSizes.length > 0) {
                        var sizes = imageSizes.sort((a, b) => b - a); // sort descending
                        var selectedOpion = null;
                        for (var i = 0; i < sizes.length; i++) {
                            if (size <= sizes[i]) {
                                selectedOpion = sizes[i];
                            }
                        }
                        if (selectedOpion === null) {
                            selectedOpion = sizes[0];
                        }
                        var data = await getData('i' + selectedOpion);
                        if (data !== null) {
                            if (type === 'user') {
                                data = x.unpack(data);
                                if (data.name === '') {
                                    data = data.value[0]; // todo verify signature 
                                } else {
                                    throw new Error();
                                }
                            } else if (type === 'group') {
                                return await x.group.decryptShared(id, data);
                            } else if (type === 'groupMember') {
                                var [groupID, userID] = id.split('$');
                                return await x.group.decryptShared(groupID, data);
                            }
                            return data;
                        }
                    }
                    if (type === 'user') {
                        var defaultImage = x.getDefaultUserImage(id, size);
                    } else if (type === 'group') {
                        var defaultImage = x.getDefaultGroupImage(size);
                    } else if (type === 'groupMember') {
                        var defaultImage = x.getDefaultUserImage(id, size);
                    } else {
                        throw new Error();
                    }
                    return await x.image.make(defaultImage, size, size, 1);
                }
            };
        };

        x.property.clearProfileCache = async (type, id) => {
            var cacheKey = type + '-' + id;
            await profilesCache.delete(cacheKey);
        };

        x.property.getPosts = async (type, id, options) => {
            var rawList = await x.services.call('posts', 'getRawPosts', { propertyType: type, propertyID: id, options: options });
            var temp = {}
            for (var postID in rawList) {
                if (rawList[postID] !== null) {
                    temp[postID] = rawList[postID];
                }
            }
            return await x.posts.makeFromRawList(type, id, temp);
        };

        x.property.checkForNewPosts = async (type, id, lastKnownPostID) => {
            var rawPosts = await x.services.call('posts', 'getRawPosts', { propertyType: type, propertyID: id, options: { order: 'desc', ignoreListCache: true } });
            var postIDs = Object.keys(rawPosts);
            var lastPostID = postIDs.length > 0 ? postIDs[0] : null;
            if (lastKnownPostID !== lastPostID) {
                lastKnownPostID = lastPostID;
                x.announceChanges([type + '/' + id + '/posts']);
            }
        };

        x.property.observeChanges = async (propertyID, keys, observer) => {
            await x.proxyCall('property.observeChanges', propertyID, keys, observer);
        };

        x.property.unobserveChanges = async (propertyID, keys, observer) => {
            await x.proxyCall('property.unobserveChanges', propertyID, keys, observer);
        };

    }


    if (typeof document !== 'undefined') {
        x.image.resize = x.image.resize_;
    } else {
        x.image.resize = async (image, width, height, quality) => {
            return await x.proxyCall('image.resize', image, width, height, quality);
        };
    }

    // if (typeof document !== 'undefined') {
    //     x.image.cropCircle = x.image.cropCircle_;
    // } else {
    //     x.image.cropCircle = async image => {
    //         return await x.proxyCall('image.cropCircle', image);
    //     };
    // }

}