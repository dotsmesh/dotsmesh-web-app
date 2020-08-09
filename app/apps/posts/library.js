/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

() => {

    var getDataStorage = async (propertyType, propertyID, prefix) => {
        if (typeof prefix === 'undefined') {
            prefix = '';
        }
        if (propertyType === 'user') {
            return x.user.getSharedDataStorage(propertyID).getContext('a/' + prefix);
        } else if (propertyType === 'group') {
            var dataStorage = await x.group.getSharedDataStorage(propertyID, 'a/');
            if (prefix !== null) {
                return dataStorage.getContext(prefix);
            }
            return dataStorage;
        }
        throw new Error();
    };

    var cache = x.cache.get('posts');

    var clearPostCache = async (propertyID, postID) => {
        var postCacheKey = 'posts/' + propertyID + '/p/' + postID;
        await cache.delete(postCacheKey);
    };

    var clearListCache = async propertyID => {
        var listCacheKey = 'posts/' + propertyID + '/l';
        await cache.delete(listCacheKey);
    };

    var getRawPosts = async (propertyType, propertyID, options = {}) => {
        var result = {};
        var cacheList = typeof options.cacheList !== 'undefined' ? options.cacheList : false;
        var cacheValues = typeof options.cacheValues !== 'undefined' ? options.cacheValues : false;
        var ignoreValues = typeof options.ignoreValues !== 'undefined' ? options.ignoreValues : false;
        var ignoreListCache = typeof options.ignoreListCache !== 'undefined' ? options.ignoreListCache : false;
        var order = typeof options.order !== 'undefined' ? options.order : 'desc';
        var limit = typeof options.limit !== 'undefined' ? options.limit : null;
        var offset = typeof options.offset !== 'undefined' ? options.offset : 0;
        var ids = typeof options.ids !== 'undefined' ? options.ids : null;

        var idsList = [];
        if (ids === null) {
            if (order === 'asc') {
                throw Error('Not supported!');
            }
            var listCacheKey = 'posts/' + propertyID + '/l';
            var cachedValue = await cache.get(listCacheKey);
            var cachedIDsList = cachedValue !== null ? cachedValue : null;
            if (ignoreListCache || cachedIDsList === null) {
                var postsContext = await getDataStorage(propertyType, propertyID, 'p/');
                var list = await postsContext.getList({ keySort: 'desc', limit: limit !== null ? limit + offset : null, sliceProperties: ['key'] });
                list.forEach(item => {
                    idsList.push(item.key);
                });
                if (cacheList) {
                    cache.set(listCacheKey, idsList);
                } else {
                    if (cachedIDsList !== null) { // delete old cache if there is a change in the noncached request
                        if (JSON.stringify(cachedIDsList.slice(0, 1)) !== idsList.slice(0, 1)) {
                            await clearListCache(propertyID);
                        }
                    }
                }
            } else {
                idsList = cachedIDsList;
            }
            ids = idsList.slice(offset, limit !== null ? offset + limit : idsList.length);
        }

        var missingIDs = [];
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            var postCacheKey = 'posts/' + propertyID + '/p/' + id;
            var cachedValue = await cache.get(postCacheKey);
            if (cachedValue !== null) {
                result[id] = ignoreValues ? null : cachedValue;
            } else {
                result[id] = null;
                missingIDs.push(id);
            }
        }
        if (missingIDs.length > 0) {
            var postsContext = await getDataStorage(propertyType, propertyID, 'p/');
            var list = await postsContext.getList({ keys: missingIDs, sliceProperties: ignoreValues && !cacheValues ? ['key'] : ['key', 'value'] });
            for (var i = 0; i < list.length; i++) {
                var item = list[i];
                var id = item.key;
                if (!ignoreValues || cacheValues) {
                    if (propertyType === 'user') {
                        var value = x.unpack(item.value);
                        if (value.name === '') {
                            var json = value.value[0]; // todo check signature
                        } else {
                            throw new Error();
                        }
                    } else if (propertyType === 'group') {
                        var value = x.unpack(item.value);
                        if (value.name === '') {
                            var value = await x.group.decryptShared(propertyID, value.value);
                            value = x.unpack(value);
                            if (value.name === '') {
                                var json = value.value[0]; // todo check signature
                            } else {
                                throw new Error()
                            }
                        } else {
                            throw new Error();
                        }
                    } else {
                        throw new Error();
                    }
                }
                if (cacheValues) {
                    var postCacheKey = 'posts/' + propertyID + '/p/' + id;
                    await cache.set(postCacheKey, json);
                }
                result[id] = ignoreValues ? null : json;
            }
        }
        result = order === 'asc' ? x.sortObjectKeyAsc(result) : x.sortObjectKeyDesc(result);
        return result;
    };

    var getPost = async (propertyType, propertyID, postID, options = {}) => {
        var list = await getRawPosts(propertyType, propertyID, {
            cacheValues: typeof options.cache !== 'undefined' ? options.cache : false,
            ids: [postID]
        });
        var json = list[postID];
        if (json === null) {
            return null;
        }
        return await x.posts.makeFromRaw(propertyType, propertyID, postID, json);
    };

    var addPost = async (propertyType, propertyID, post) => {
        var changeKey = propertyType + '/' + propertyID + '/posts';
        if (propertyType === 'user') {
            if (propertyID === x.currentUser.getID()) {
                var dataStorage = x.currentUser.getDataStorage('s/a/');
                var postID = x.generateDateBasedID();//post.id !== null ? post.id : 
                var serializedPost = await post.pack();
                var buffer = dataStorage.getBuffer();
                buffer.set('p/' + postID, x.pack('', [serializedPost.value, await x.currentUser.sign(serializedPost.value)]));
                for (var resourceID in serializedPost.resourcesToSave) {
                    var resourceValue = serializedPost.resourcesToSave[resourceID];
                    buffer.set('a/' + postID + '-' + resourceID, x.pack('', [resourceValue, await x.currentUser.sign(resourceValue)]));
                }
                for (var resourceID in serializedPost.resourcesToDelete) {
                    buffer.delete('a/' + postID + '-' + serializedPost.resourcesToDelete[resourceID]);
                }
                await buffer.flush();
                await clearListCache(propertyID);
                await x.announceChanges([changeKey]);
                await x.currentUser.announceChanges(['up']);
                return postID;
            }
        } else if (propertyType === 'group') {
            var serializedPost = await post.pack();
            var resourcesToSave = {};
            for (var resourceID in serializedPost.resourcesToSave) {
                var resourceValue = serializedPost.resourcesToSave[resourceID];
                resourcesToSave[resourceID] = x.pack('', await x.group.encryptShared(propertyID, x.pack('', [resourceValue, await x.currentUser.sign(resourceValue)])));
            }
            var response = await x.group.call(propertyID, 'group.posts.add', {
                post: x.pack('', await x.group.encryptShared(propertyID, x.pack('', [serializedPost.value, await x.currentUser.sign(serializedPost.value)]))),
                resources: resourcesToSave,
            }, { auth: 'auto' });
            if (response.status === 'ok') {
                await clearListCache(propertyID);
                await x.announceChanges([changeKey]);
                return response.id;
            }
            throw new Error('Error posting');
        }
        throw new Error();
    }

    var deletePost = async (propertyType, propertyID, postID) => {
        var changeKey = propertyType + '/' + propertyID + '/posts';
        if (propertyType === 'user') {
            if (propertyID === x.currentUser.getID()) {
                var dataStorage = x.currentUser.getDataStorage('s/a/');
                var list = await dataStorage.getList({ keyStartWith: 'a/' + postID + '-', sliceProperties: ['key'] });
                var buffer = dataStorage.getBuffer();
                for (i = 0; i < list.length; i++) {
                    buffer.delete(list[i].key);
                }
                buffer.delete('p/' + postID);
                await buffer.flush();
                await clearPostCache(propertyID, postID);
                await clearListCache(propertyID);
                await x.announceChanges([changeKey]);
                await x.currentUser.announceChanges(['up']);
                return;
            }
        } else if (propertyType === 'group') {
            var response = await x.group.call(propertyID, 'group.posts.delete', {
                postID: postID
            }, { auth: 'auto' });
            //console.log(response);
            if (response.status === 'ok') {
                await clearPostCache(propertyID, postID);
                await clearListCache(propertyID);
                await x.announceChanges([changeKey]);
                return;
            }
            throw new Error('Error posting');
        }
        throw new Error();
    };

    var getPostResource = async (propertyType, propertyID, postID, resourceID) => {
        var cacheKey = 'postsr/' + propertyType + '/' + propertyID + '/' + postID + '/' + resourceID;
        var value = await cache.get(cacheKey);
        if (value !== null) {
            return value;
        }
        var dataStorage = await getDataStorage(propertyType, propertyID);
        var value = await dataStorage.get('a/' + postID + '-' + resourceID);
        if (propertyType === 'user') {
            value = x.unpack(value);
            if (value.name === '') {
                value = value.value[0]; // todo check signature
            } else {
                throw new Error();
            }
        } else if (propertyType === 'group') {
            var value = x.unpack(value);
            if (value.name === '') {
                var value = await x.group.decryptShared(propertyID, value.value);
                value = x.unpack(value);
                if (value.name === '') {
                    value = value.value[0]; // todo check signature
                } else {
                    throw new Error();
                }
            } else {
                throw new Error();
            }
        } else {
            throw new Error();
        }
        await cache.set(cacheKey, value);
        return value;
    };

    var addPostReaction = async (propertyType, propertyID, postID, reaction, onChange = null) => {
        if (propertyType === 'group') {
            var hasOnChange = onChange !== null;
            if (hasOnChange) {
                var callOnChange = async reaction => {
                    await onChange(reaction);
                }
                var clonedReaction = await reaction.clone();
                clonedReaction.data.t = { // tasks
                    s: null //save
                };
                callOnChange(clonedReaction);
            }
            var reactionToSave = await reaction.clone();
            reactionToSave.id = null; // make sure the ID is null
            var serializedReaction = await reactionToSave.pack();
            console.log(serializedReaction);
            var resourcesToSave = {};
            for (var resourceID in serializedReaction.resourcesToSave) {
                var resourceValue = serializedReaction.resourcesToSave[resourceID];
                resourcesToSave[resourceID] = x.pack('', await x.group.encryptShared(propertyID, x.pack('', [resourceValue, await x.currentUser.sign(resourceValue)])));
            }
            var response = await x.group.call(propertyID, 'group.posts.addPostReaction', {
                postID: postID,
                reaction: x.pack('', await x.group.encryptShared(propertyID, x.pack('', [serializedReaction.value, await x.currentUser.sign(serializedReaction.value)]))),
                resources: resourcesToSave,
            }, { auth: 'auto' });
            //console.log(response);
            if (response.status === 'ok') {
                if (hasOnChange) {
                    delete clonedReaction.data.t.s; // delete save task
                    callOnChange(clonedReaction);
                }
                return response.id;
            }
        }
        throw new Error();
    };

    var getPostReactionsIDs = async (propertyType, propertyID, postID) => {
        var dataStorage = await getDataStorage(propertyType, propertyID);
        var prefix = 'r/' + postID + '/';
        var list = await dataStorage.getList({ keyStartWith: prefix, sliceProperties: ['key'] });
        var result = [];
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            var id = item.key.substr(prefix.length);
            result.push(id);
        }
        return result;
    };

    var getPostReactions = async (propertyType, propertyID, postID, options = {}) => {
        if (propertyType === 'group') {
            var dataStorage = await getDataStorage(propertyType, propertyID);
            var prefix = 'r/' + postID + '/';
            var list = await dataStorage.getList({ keyStartWith: prefix, keySort: 'desc', limit: 10 });
            var result = [];
            for (var i = 0; i < list.length; i++) {
                var item = list[i];
                var id = item.key.substr(prefix.length);
                var value = x.unpack(item.value);
                if (value.name === '') {
                    var value = await x.group.decryptShared(propertyID, value.value);
                    value = x.unpack(value);
                    if (value.name === '') {
                        var json = value.value[0]; // todo check signature
                    } else {
                        throw new Error();
                    }
                } else {
                    throw new Error();
                }
                var reaction = await x.posts.unpack(id, json, async (reaction, resourceID) => {
                    var dataStorage = await getDataStorage(propertyType, propertyID);
                    var value = await dataStorage.get('e/' + postID + '/' + reaction.id + '-' + resourceID);
                    var value = x.unpack(value);
                    if (value.name === '') {
                        var value = await x.group.decryptShared(propertyID, value.value);
                        value = x.unpack(value);
                        if (value.name === '') {
                            value = value.value[0]; // todo check signature
                        } else {
                            throw new Error();
                        }
                    } else {
                        throw new Error();
                    }
                    return value;
                });
                result.push(reaction);
            }
            return result;
        }
        throw new Error();
    };


    return {
        getRawPosts: getRawPosts,
        getPostResource: getPostResource,
        getPost: getPost,
        addPost: addPost,
        deletePost: deletePost,
        addPostReaction: addPostReaction,
        getPostReactions: getPostReactions,
        getPostReactionsIDs: getPostReactionsIDs
    };
}