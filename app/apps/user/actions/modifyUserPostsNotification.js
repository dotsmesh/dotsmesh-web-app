async (args, library) => {
    return await library.modifyUserPostsNotification(args.action, args.userID, args.lastSeenPosts);
};