/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    if (args.type === 'mm') {
        var data = x.unpack(args.data);
        if (data.name === 'm') {
            data = data.value;
            var message = x.posts.unpack(data.i, data.v); // validate
            var senderID = message.userID;
            var recipients = data.o; // other recipients// validate
            recipients.push(x.currentUser.getID());
            recipients.push(senderID);
            var threadID = await library.getOrMakeThreadID(recipients);
            //message.id = x.generateDateBasedID(); // id must stay so it's referenced in the future (reactions)
            message.date = Date.now(); // date is updated so it shows last
            await library.addIncomingMessage(threadID, message, args.resources);
        }
    }
}