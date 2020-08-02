async (args, library) => {
    return await library.modifyGroupPostReactionsNotification(args.action, args.groupID, args.postID, args.lastSeenPostReactions);
};