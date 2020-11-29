/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

() => {

    var dataStorage = null;
    var getDataStorage = () => {
        if (dataStorage === null) {
            dataStorage = x.currentUser.getDataStorage('p/e/');
        }
        return dataStorage;
    };

    var followingStorage = null;
    var getFollowingDataStorage = () => {
        if (followingStorage === null) {
            followingStorage = getDataStorage().getDetailsContext('f-', x.currentUser.isPublic() ? x.currentUserCache.get('exploref-dc') : null);
        }
        return followingStorage;
    };

    var follow = async (propertyType, propertyID) => {
        var storage = getFollowingDataStorage();
        await storage.set(x.getTypedID(propertyType, propertyID));
        await x.property.observeChanges(propertyID, [propertyType === 'user' ? 'up' : 'gp'], 'e');
        x.announceChanges(['explore/following', 'explore/following/' + propertyType + '/' + propertyID]);
    };

    var unfollow = async (propertyType, propertyID) => {
        var storage = getFollowingDataStorage();
        await storage.delete(x.getTypedID(propertyType, propertyID));
        await x.property.unobserveChanges(propertyID, [propertyType === 'user' ? 'up' : 'gp'], 'e');
        x.announceChanges(['explore/following', 'explore/following/' + propertyType + '/' + propertyID]);
    };

    var isFollowing = async (propertyType, propertyID) => {
        var storage = getFollowingDataStorage();
        return await storage.exists(x.getTypedID(propertyType, propertyID));
    };

    var getFollowing = async () => {
        var storage = getFollowingDataStorage();
        var list = await storage.getList();
        return Object.keys(list);
    };

    var propertiesDataStorage = null;
    var getPropertiesDataStorage = () => {
        if (propertiesDataStorage === null) {
            propertiesDataStorage = getDataStorage().getDetailsContext('p-', x.currentUser.isPublic() ? x.currentUserCache.get('explorep-dc') : null);
        }
        return propertiesDataStorage;
    };

    var getPropertiesPosts = async (properties, options = {}) => {
        await updateAllProperties();
        var storage = getPropertiesDataStorage();
        var order = typeof options.order !== 'undefined' ? options.order : null;
        var offset = typeof options.offset !== 'undefined' ? options.offset : 0;
        var limit = typeof options.limit !== 'undefined' ? options.limit : null;
        var tempIDs = {};
        for (var i = 0; i < properties.length; i++) {
            var typedPropertyID = properties[i];
            var propertyDetails = await storage.get(typedPropertyID, ['i']);
            var postIDs = propertyDetails !== null && propertyDetails['i'] !== null ? propertyDetails['i'] : [];
            if (postIDs.length > 0) {
                if (order !== null) {
                    postIDs.sort();
                    if (order === 'desc') {
                        postIDs.reverse();
                    }
                }
                if (limit !== null) {
                    postIDs = postIDs.slice(0, offset + limit);
                }
                postIDs.forEach(postID => {
                    tempIDs[postID + '/' + typedPropertyID] = { typedPropertyID: typedPropertyID, postID: postID };
                })
            }
        }
        if (order === 'asc') {
            tempIDs = x.sortObjectKeyAsc(tempIDs);
        } else if (order === 'desc') {
            tempIDs = x.sortObjectKeyDesc(tempIDs);
        }
        var resultList = Object.values(tempIDs);
        if (limit !== null) {
            resultList = resultList.slice(offset, offset + limit);
        }

        var propertyPostsIDs = {};
        var propertyPosts = {};
        resultList.forEach(postData => {
            var typedPropertyID = postData.typedPropertyID;
            if (typeof propertyPostsIDs[typedPropertyID] === 'undefined') {
                propertyPostsIDs[typedPropertyID] = [];
                propertyPosts[typedPropertyID] = [];
            }
            propertyPostsIDs[typedPropertyID].push(postData.postID);
        });
        for (var typedPropertyID in propertyPostsIDs) { // async maybe ????
            var propertyData = x.parseTypedID(typedPropertyID);
            var posts = await x.property.getPosts(propertyData.type, propertyData.id, { ids: propertyPostsIDs[typedPropertyID], cacheValues: true });
            posts.forEach(post => {
                if (post !== null) {
                    propertyPosts[typedPropertyID][post.id] = post;
                }
            });
        }
        var result = [];
        resultList.forEach(postData => {
            if (typeof propertyPosts[postData.typedPropertyID][postData.postID] !== 'undefined') {
                result.push(propertyPosts[postData.typedPropertyID][postData.postID]);
            }
        });
        return result;
    };

    var updateAllProperties = async cacheTTL => {
        if (typeof cacheTTL === 'undefined') {
            cacheTTL = 0;
        }
        cacheTTL = 10;
        var maxTime = Date.now() - cacheTTL * 1000;
        var followingIDs = await getFollowing();
        var storage = getPropertiesDataStorage();
        var list = await storage.getList(['d']);
        var datesList = {};
        for (var key in list) {
            datesList[key] = list[key].d;
        };
        datesList = x.sortObjectValueAsc(datesList);
        var knownIDs = Object.keys(datesList);
        var unknownIDs = x.arrayDifference(followingIDs, knownIDs); // give priority to unknown
        for (var i = 0; i < unknownIDs.length; i++) {
            await updateProperty(unknownIDs[i]);
        }
        for (var i = 0; i < knownIDs.length; i++) {
            var typedPropertyID = knownIDs[i];
            if (datesList[typedPropertyID] < maxTime) {
                await updateProperty(typedPropertyID);
                return;
            }
        }
        // todo remove old
    };

    var updateProperty = async typedPropertyID => {
        var storage = getPropertiesDataStorage();
        var propertyIDData = x.parseTypedID(typedPropertyID);
        try {
            var posts = await x.services.call('posts', 'getRawPosts', { propertyType: propertyIDData.type, propertyID: propertyIDData.id, options: { order: 'desc', offset: 0, limit: 200, ignoreValues: true, cacheList: true, ignoreListCache: true } }); // todo update limit
        } catch (e) {
            if (['invalidMemberID', 'invalidAccessKey', 'groupNotFound', 'propertyUnavailable'].indexOf(e.name) !== -1) {
                posts = [];
            } else {
                throw e;
            }
        }
        var postsIDs = Object.keys(posts);
        var propertyDetails = await storage.get(typedPropertyID, ['i']);
        var hasChange = propertyDetails === null || JSON.stringify(propertyDetails['i']) !== JSON.stringify(postsIDs);
        await storage.set(typedPropertyID, { d: Date.now(), i: postsIDs });
        if (hasChange) {
            x.announceChanges(['follow/' + typedPropertyID + '/posts', 'temp_explore']);
        }
        return hasChange;
    };

    var addPropertiesToUpdateQueue = async propertyIDs => {
        var followingIDs = await getFollowing();
        for (var propertyID of propertyIDs) {
            var typedPropertyID = x.getTypedID('group', propertyID); // test is group
            var propertyIDToAdd = null;
            if (followingIDs.indexOf(propertyID) !== -1) {
                propertyIDToAdd = propertyID;
            } else if (followingIDs.indexOf(typedPropertyID) !== -1) {
                propertyIDToAdd = typedPropertyID;
            }
            if (propertyIDToAdd !== null) {
                //var dataStorage = getDataStorage();
                // todo queue
                await updateProperty(propertyIDToAdd);
            }
        }
    };

    return {
        follow: follow,
        unfollow: unfollow,
        isFollowing: isFollowing,
        getFollowing: getFollowing,
        getPropertiesPosts: getPropertiesPosts,
        updateAllProperties: updateAllProperties,
        updateProperty: updateProperty,
        addPropertiesToUpdateQueue: addPropertiesToUpdateQueue
    };
};