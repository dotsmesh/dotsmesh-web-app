async (args, library) => {
    return await library.exists(args.groupID);
};