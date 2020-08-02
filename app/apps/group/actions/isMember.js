async (args, library) => {
    return await library.isMember(args.groupID, args.typedID);
};