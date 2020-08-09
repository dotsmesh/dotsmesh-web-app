
/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

() => {

    var parseLog = (value, namesFilter, order, limit) => {
        if (value === null) {
            return [];
        }
        if (typeof namesFilter === 'undefined') {
            namesFilter = null;
        }
        if (typeof order === 'undefined') {
            order = 'asc';
        }
        if (typeof limit === 'undefined') {
            limit = null;
        }
        var lines = value.split("\n");
        if (order === 'desc') {
            lines.reverse();
        }
        var result = [];
        var linesCount = lines.length;
        for (var i = 0; i < linesCount; i++) {
            var line = lines[i];
            if (line.length > 0) {
                var index = line.indexOf(':');
                var date = line.substring(0, index);
                var data = x.unpack(line.substring(index + 1));
                if (namesFilter !== null && namesFilter.indexOf(data.name) === -1) {
                    continue;
                }
                result.push({
                    date: x.parseDateID(date),
                    name: data.name,
                    data: data.value
                });
                if (limit !== null) {
                    if (result.length === limit) {
                        break;
                    }
                }
            }
        }
        return result;
    };

    var parseInvitationData = async (groupID, rawData) => {
        return rawData;
    };

    var getInvitationsList = async groupID => {
        var dataStorage = await x.group.getFullDataStorage(groupID, 'p/i/');
        var list = await dataStorage.getList();
        var result = [];
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            var value = item.value;
            result.push(await parseInvitationData(groupID, value));
        }
        return result;
    };

    var parseMemberData = async (groupID, rawData, pending) => {
        var result = {
            dateInvited: null,
            invitedBy: null,
            dateRequestedJoin: null,
            dateJoined: null,
            userID: null,
            status: pending ? 'pendingApproval' : 'active'
        };
        var data = x.unpack(rawData);
        if (data.name === 'z' || data.name === 'w') { // joined with url; z - not approved yet, w - approved
            var invitationData = x.unpack(await x.group.decryptShared(groupID, data.value[0]));
            if (invitationData.name === '1') {
                result.dateInvited = x.parseDateID(invitationData.value.d);
                result.invitedBy = invitationData.value.w;
            } else {
                throw new Error();
            }
            var memberData = x.unpack(await x.group.decryptShared(groupID, data.value[1]));
            if (memberData.name === 'y') {
                result.userID = memberData.value.i;
            } else {
                throw new Error();
            }
            result.dateRequestedJoin = x.parseDateID(data.value[2]);
            if (data.name === 'w') {
                result.dateJoined = x.parseDateID(data.value[3]);
            }
        } else if (data.name === 'y') { // specificaly invited or the founder
            var invitationData = x.unpack(await x.group.decryptShared(groupID, data.value[0]));
            if (invitationData.name === '') {
                result.userID = invitationData.value.i;
                if (typeof invitationData.value.d !== 'undefined') {
                    result.dateInvited = x.parseDateID(invitationData.value.d);
                }
                if (typeof invitationData.value.w !== 'undefined') {
                    result.invitedBy = invitationData.value.w;
                }
            } else {
                throw new Error();
            }
            result.dateJoined = x.parseDateID(data.value[1]);
        } else {
            throw new Error();
        }
        return result;
    };

    var getPendingMembersUserIDs = async groupID => {
        var list = await getPendingMembersList(groupID);
        var result = [];
        for (var member of list) {
            result.push(member.userID);
        }
        return result;
    }

    var getPendingMembersList = async groupID => {
        var dataStorage = await x.group.getSharedDataStorage(groupID);
        var list = await dataStorage.getList({ keyStartWith: 'm/p/', keyEndWith: '/a' });
        var result = [];
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            var value = item.value;
            //var memberID = item.key.substr(8, item.key.length - 10); // pending/xxx/a // todo validate memberID matched userID
            result.push(await parseMemberData(groupID, value, true));
        }
        return result;
    };

    var getMembersList = async groupID => {
        var dataStorage = await x.group.getSharedDataStorage(groupID);
        var list = await dataStorage.getContext('l/m/').getList({ keySort: 'desc' });
        var members = [];
        var membersLeft = [];
        list.forEach(item => {
            var logItems = parseLog(item.value, ['0', '2', 'a', 'b'], 'desc');
            var logItemsCount = logItems.length;
            for (var i = 0; i < logItemsCount; i++) {
                var logItem = logItems[i];
                var memberID = logItem.data;
                if (logItem.name === '0' || logItem.name === 'b') { // new member or approved member
                    if (membersLeft.indexOf(memberID) === -1) {
                        members.push(memberID);
                    }
                } else if (logItem.name === '2' || logItem.name === 'a') { // member left or deleted
                    membersLeft.push(memberID);
                }
            }
        });
        if (members.length === 0) {
            return [];
        }
        var keysToRequest = [];
        members.forEach(memberID => {
            keysToRequest.push('m/a/' + memberID + '/a');
        });
        var list = await dataStorage.getList({ keys: keysToRequest });
        var result = [];
        var itemsCount = list.length;
        for (var i = 0; i < itemsCount; i++) {
            var item = list[i];
            var value = item.value;
            result.push(await parseMemberData(groupID, value, false));
        }
        return result;
    };

    var getMemberData = async (groupID, userID) => {
        var dataStorage = await x.group.getSharedDataStorage(groupID);
        var memberID = await x.groups.getMemberID(groupID, userID);
        var rawData = await dataStorage.get('m/a/' + memberID + '/a');
        if (rawData !== null) {
            return await parseMemberData(groupID, rawData, false);
        }
        var rawData = await dataStorage.get('m/p/' + memberID + '/a');
        if (rawData !== null) {
            return await parseMemberData(groupID, rawData, true);
        }
        return null;
    };

    var getMemberActivity = async (groupID, userID) => {
        var dataStorage = await x.group.getSharedDataStorage(groupID);
        var memberID = await x.groups.getMemberID(groupID, userID);
        var list = await dataStorage.getContext('m/a/' + memberID + '/l/').getList({ keySort: 'desc' });
        var result = [];
        list.forEach(item => {
            result = result.concat(parseLog(item.value, null, 'desc'));
        });
        return result;
    };

    var isMember = async (groupID, userID) => {
        try {
            var dataStorage = await x.group.getSharedDataStorage(groupID);
            var memberID = await x.groups.getMemberID(groupID, userID);
            return await dataStorage.exists('m/a/' + memberID + '/a');
        } catch (e) {
            if (['invalidMemberID', 'invalidAccessKey', 'groupNotFound'].indexOf(e.name) !== -1) {
                return false;
            }
            throw e;
        }
    };

    // var getMemberDetails = async (groupID, userID) => {
    //     try {
    //         var dataStorage = await x.group.getSharedDataStorage(groupID);
    //         var memberID = await x.groups.getMemberID(groupID, userID);
    //         var value = await dataStorage.get('m/a/' + memberID + '/d/g');
    //         if (value === null) {
    //             return null;
    //         }
    //         var result = {
    //             providedAccessKey: null
    //         };
    //         var data = x.unpack(await x.group.decryptShared(groupID, value));
    //         if (data.name === '') {
    //             var data = data.value;
    //             if (typeof data.a !== 'undefined') {
    //                 result.providedAccessKey = data.a;
    //             }
    //         }
    //         return result;
    //     } catch (e) {
    //         if (['invalidMemberID', 'invalidAccessKey', 'groupNotFound'].indexOf(e.name) !== -1) {
    //             return null;
    //         }
    //         throw e;
    //     }
    // };

    var approveMember = async (groupID, userID) => {
        var response = await x.group.call(groupID, 'group.members.approve', {
            memberID: await x.groups.getMemberID(groupID, userID)
        }, { auth: 'auto' });
        console.log(response);
        await x.announceChanges(['group/' + groupID + '/members', 'group/' + groupID + '/member/' + userID]);
    };

    var removeMember = async (groupID, userID) => {
        var response = await x.group.call(groupID, 'group.members.delete', {
            memberID: await x.groups.getMemberID(groupID, userID)
        }, { auth: 'auto' });
        console.log(response);
        await x.announceChanges(['group/' + groupID + '/members', 'group/' + groupID + '/member/' + userID]);
    };

    var updatePendingMembersNotification = async (groupID, update) => {
        var notificationID = 'gmp$' + groupID;
        var notification = await x.notifications.get(notificationID);
        if (notification === null) {
            return;
        }

        if (update.usersIDs !== undefined) {
            if (x.isSameContent(notification.data.i, update.usersIDs)) {
                return;
            }
            notification.data.i = update.usersIDs;
        } else if (update.lastSeenUsersIDs !== undefined) {
            if (x.isSameContent(notification.data.l, update.lastSeenUsersIDs)) {
                return;
            }
            notification.data.l = update.lastSeenUsersIDs;
        } else {
            throw new Error();
        }

        var lastUsersIDs = notification.data.i;
        var lastSeenUsersIDs = notification.data.l;
        var notSeenUsersIDs = x.arrayDifference(lastUsersIDs, lastSeenUsersIDs);

        if (notSeenUsersIDs.length > 0) {
            if (!x.isSameContent(notification.data.n, notSeenUsersIDs)) {
                var profile = await x.property.getProfile('group', groupID);
                var count = notSeenUsersIDs.length;
                notification.visible = true;
                notification.title = profile.name + ' (pending approval)';
                notification.text = (count === 1 ? '1 new member is pending approval' : count + ' new members are pending approval');
                notification.data.n = notSeenUsersIDs;
                notification.image = { type: 'groupProfile', id: groupID };
                notification.tags = ['g'];
            }
        } else {
            notification.visible = false;
            notification.title = null;
            notification.text = null;
        }
        await x.notifications.set(notification);
    };

    var modifyPendingMembersNotification = async (action, groupID, lastSeenUsersIDs) => {
        var notificationID = 'gmp$' + groupID;
        if (action === 'add') {
            await x.property.observeChanges(groupID, ['gmp'], 'n');
            var notification = await x.notifications.make(notificationID);
            notification.data = { l: lastSeenUsersIDs, i: [], n: [] };
            notification.onClick = { location: 'group/members', args: { id: groupID, mode: 'pendingApproval' } };
            await x.notifications.set(notification);
        } else {
            await x.property.unobserveChanges(groupID, ['gmp'], 'n');
            await x.notifications.delete(notificationID);
        }
    };

    var updateGroupPostsNotification = async (groupID, update) => {
        var notificationID = 'gp$' + groupID;
        var notification = await x.notifications.get(notificationID);
        if (notification === null) {
            return;
        }

        if (update.lastPosts !== undefined) {
            if (x.isSameContent(notification.data.i, update.lastPosts)) {
                return;
            }
            notification.data.i = update.lastPosts;
        } else if (update.lastSeenPosts !== undefined) {
            if (x.isSameContent(notification.data.l, update.lastSeenPosts)) {
                return;
            }
            notification.data.l = update.lastSeenPosts;
        } else {
            throw new Error();
        }

        var lastPostsIDs = x.shallowCopyArray(notification.data.i);
        var lastSeenPostsIDs = x.shallowCopyArray(notification.data.l);

        lastPostsIDs.sort().reverse();
        lastSeenPostsIDs.sort().reverse();
        var lastSeenPostID = null;
        for (var postID of lastSeenPostsIDs) {
            if (lastPostsIDs.indexOf(postID) !== null) {
                lastSeenPostID = postID;
                break;
            }
        }
        var notSeenPosts = [];
        if (lastSeenPostID !== null) {
            var index = lastPostsIDs.indexOf(lastSeenPostID);
            if (index === 0) {
                // seen all
            } else {
                notSeenPosts = lastPostsIDs.slice(0, index);
            }
        } else {
            // cannot find
            notSeenPosts = lastPostsIDs.slice(0, 11); // to show 10+
        }

        var notSeenPostsCount = notSeenPosts.length;
        if (notSeenPostsCount > 0) {
            if (!x.isSameContent(notification.data.n, notSeenPosts)) {
                var profile = await x.property.getProfile('group', groupID);
                //var title = '';
                var text = '';
                if (notSeenPostsCount === 1) {
                    //title = 'New post in ';
                    text = '1 new post in this group';
                } else if (notSeenPostsCount === 11) {
                    //title = 'News posts in ';
                    text = '10+ new posts in this group';
                } else {
                    //title = 'News posts in ';
                    text = notSeenPostsCount + ' new posts in this group';
                }
                //title += profile.name;
                //text += profile.name;
                notification.visible = true;
                notification.title = profile.name;//title;
                notification.text = text;
                notification.data.n = notSeenPosts;
                notification.image = { type: 'groupProfile', id: groupID };
                notification.tags = ['g', 'p'];
            }
        } else {
            notification.visible = false;
            notification.title = null;
            notification.text = null;
        }
        await x.notifications.set(notification);
    };

    var modifyGroupPostsNotification = async (action, groupID, lastSeenPosts) => {
        var notificationID = 'gp$' + groupID;
        if (action === 'add') {
            await x.property.observeChanges(groupID, ['gp'], 'n');
            var notification = await x.notifications.make(notificationID);
            notification.data = { l: lastSeenPosts, i: [], n: [] };
            notification.onClick = { location: 'group/home', args: { id: groupID } };
            await x.notifications.set(notification);
        } else {
            await x.property.unobserveChanges(groupID, ['gp'], 'n');
            await x.notifications.delete(notificationID);
        }
    };

    var updateGroupPostReactionsNotification = async (groupID, postID, update) => {
        var notificationID = 'gpr$' + groupID + '$' + postID;
        var notification = await x.notifications.get(notificationID);
        if (notification === null) {
            return;
        }

        if (update.lastPostReactions !== undefined) {
            if (x.isSameContent(notification.data.i, update.lastPostReactions)) {
                return;
            }
            notification.data.i = update.lastPostReactions;
        } else if (update.lastSeenPostReactions !== undefined) {
            if (x.isSameContent(notification.data.l, update.lastSeenPostReactions)) {
                return;
            }
            notification.data.l = update.lastSeenPostReactions;
        } else {
            throw new Error();
        }

        var lastPostReactionsIDs = x.shallowCopyArray(notification.data.i);
        var lastSeenPostReactionsIDs = x.shallowCopyArray(notification.data.l);

        lastPostReactionsIDs.sort().reverse();
        lastSeenPostReactionsIDs.sort().reverse();
        var lastSeenPostReactionID = null;
        for (var postID of lastSeenPostReactionsIDs) {
            if (lastPostReactionsIDs.indexOf(postID) !== null) {
                lastSeenPostReactionID = postID;
                break;
            }
        }
        var notSeenPostReactions = [];
        if (lastSeenPostReactionID !== null) {
            var index = lastPostReactionsIDs.indexOf(lastSeenPostReactionID);
            if (index === 0) {
                // seen all
            } else {
                notSeenPostReactions = lastPostReactionsIDs.slice(0, index);
            }
        } else {
            // cannot find
            notSeenPostReactions = lastPostReactionsIDs.slice(0, 11); // to show 10+
        }

        if (notSeenPostReactions.length > 0) {
            if (!x.isSameContent(notification.data.n, notSeenPostReactions)) {
                var profile = await x.property.getProfile('group', groupID);
                notification.visible = true;
                notification.title = profile.name + ' (post update)';
                notification.text = 'A post you\'re following has been updated';
                notification.data.n = notSeenPostReactions;
                notification.image = { type: 'groupProfile', id: groupID };
                notification.tags = ['g', 'r'];
            }
        } else {
            notification.visible = false;
            notification.title = null;
            notification.text = null;
        }
        await x.notifications.set(notification);
    };

    var modifyGroupPostReactionsNotification = async (action, groupID, postID, lastSeenPostReactions) => {
        var notificationID = 'gpr$' + groupID + '$' + postID;
        if (action === 'add') {
            await x.property.observeChanges(groupID, ['gp/' + postID], 'n');
            var notification = await x.notifications.make(notificationID);
            notification.data = { l: lastSeenPostReactions, i: [], n: [] };
            notification.onClick = { location: 'posts/post', args: { groupID: groupID, postID: postID } };
            await x.notifications.set(notification);
        } else {
            await x.property.unobserveChanges(groupID, ['gp/' + postID], 'n');
            await x.notifications.delete(notificationID);
        }
    };

    var getProfileImage = async (groupID, size) => {
        var profile = await x.group.getProfile(groupID);
        return await profile.getImage(size);
    };

    return {
        getMembersList: getMembersList,
        getPendingMembersList: getPendingMembersList,
        getPendingMembersUserIDs: getPendingMembersUserIDs,
        getInvitationsList: getInvitationsList,
        getMemberActivity: getMemberActivity,
        isMember: isMember,
        //getMemberDetails: getMemberDetails,
        getMemberData: getMemberData,
        approveMember: approveMember,
        removeMember: removeMember,
        updatePendingMembersNotification: updatePendingMembersNotification,
        modifyPendingMembersNotification: modifyPendingMembersNotification,
        updateGroupPostsNotification: updateGroupPostsNotification,
        modifyGroupPostsNotification: modifyGroupPostsNotification,
        updateGroupPostReactionsNotification: updateGroupPostReactionsNotification,
        modifyGroupPostReactionsNotification: modifyGroupPostReactionsNotification,
        getProfileImage: getProfileImage
    };
};