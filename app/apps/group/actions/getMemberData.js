async (args, library) => {
    return await library.getMemberData(args.groupID, args.userID);
};