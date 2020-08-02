async (args, library) => {
    return await library.getInvitationURL(args.groupID);
};