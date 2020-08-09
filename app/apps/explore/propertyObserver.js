/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

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