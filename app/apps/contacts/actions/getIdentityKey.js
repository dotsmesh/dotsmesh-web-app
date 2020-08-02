async (args, library) => {
    return await library.getIdentityKey(args.userID);
};