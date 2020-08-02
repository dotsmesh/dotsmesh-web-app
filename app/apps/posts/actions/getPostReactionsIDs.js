async (args, library) => {
    return await library.getPostReactionsIDs(args.propertyType, args.propertyID, args.postID);
};