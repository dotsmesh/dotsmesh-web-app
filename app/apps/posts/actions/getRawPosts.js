async (args, library) => {
    return await library.getRawPosts(args.propertyType, args.propertyID, args.options);
};