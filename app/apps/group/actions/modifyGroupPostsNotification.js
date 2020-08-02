async (args, library) => {
    return await library.modifyGroupPostsNotification(args.action, args.groupID, args.lastSeenPosts);
};