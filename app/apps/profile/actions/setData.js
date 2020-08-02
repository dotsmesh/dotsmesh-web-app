async (args, library) => {
    await library.setData(args.propertyType, args.propertyID, args.data);
};