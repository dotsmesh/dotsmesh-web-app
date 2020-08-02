async (args, library) => {
    //console.log(args);
    var changes = args.changes;
    //console.table(changes);

    for (var change of changes) {
        if (change.key.indexOf('gm/') === 0) {
            var groupID = change.propertyID;
            await library.checkIfApproved(groupID);
        }
    }
}