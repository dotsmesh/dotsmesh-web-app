async (args, library) => {
    //console.log(args);
    var changes = args.changes;
    var propertyIDsToAdd = [];
    for (var change of changes) {
        if (change.key === 'up' || change.key === 'gp') {
            propertyIDsToAdd.push(change.propertyID);
        }
    }
    if (propertyIDsToAdd.length > 0) {
        await library.addPropertiesToUpdateQueue(propertyIDsToAdd);
    }
}