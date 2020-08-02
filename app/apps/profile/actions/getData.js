async (args, library) => {
    return await library.getData(args.propertyType, args.propertyID);
};