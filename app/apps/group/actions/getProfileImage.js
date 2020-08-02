async (args, library) => {
    return await library.getProfileImage(args.groupID, args.size);
};