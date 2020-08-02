async (args, library) => {
    return await library.getPostResource(args.propertyType, args.propertyID, args.postID, args.resourceID);
};