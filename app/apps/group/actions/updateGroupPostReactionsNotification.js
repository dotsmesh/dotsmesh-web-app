async (args, library) => {
    return await library.updateGroupPostReactionsNotification(args.groupID, args.postID, { lastSeenPostReactions: args.lastSeenPostReactions });
};