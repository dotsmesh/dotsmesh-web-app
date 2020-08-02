async (args, library) => {
    return await library.follow(args.type, args.id);
};