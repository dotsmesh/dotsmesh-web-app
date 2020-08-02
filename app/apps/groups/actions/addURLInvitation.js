async (args, library) => {
    return await library.addURLInvitation(args.groupID, args.accessKey);
};