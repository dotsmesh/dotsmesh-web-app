async (args, library) => {
    return await library.getProfileImage(args.userID, args.size);
};