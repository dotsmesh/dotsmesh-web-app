async (args, library) => {
    return await library.getMemberDetails(args.groupID, args.typedID);
};