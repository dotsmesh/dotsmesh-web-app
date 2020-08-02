async (args, library) => {
    return await library.get(args.groupID, args.details);
};