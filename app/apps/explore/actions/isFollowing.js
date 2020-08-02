async (args, library) => {
    return await library.isFollowing(args.type, args.id);
};