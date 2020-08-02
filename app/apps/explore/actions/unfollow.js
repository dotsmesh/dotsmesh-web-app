async (args, library) => {
    return await library.unfollow(args.type, args.id);
};