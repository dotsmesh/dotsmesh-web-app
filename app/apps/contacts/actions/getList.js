async (args, library) => {
    return await library.getList(typeof args.details !== 'undefined' ? args.details : []);
};