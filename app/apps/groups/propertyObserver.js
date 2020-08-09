/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

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