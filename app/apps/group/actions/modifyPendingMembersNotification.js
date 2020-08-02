async (args, library) => {
    return await library.modifyPendingMembersNotification(args.action, args.groupID, args.lastSeenUsersIDs);
};