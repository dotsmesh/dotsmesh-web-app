/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var userID = args.pickedID;
    var profile = await x.user.getProfile(userID);
    var status = await library.invite(args.groupID, args.pickedID);
    if (status === 'ok') {
        return {
            text: 'An invitation has been sent to ' + profile.name + '!'
        }
    } else if (status === 'alreadyMember') {
        return {
            text: profile.name + ' is already a member of this group!'
        }
    } else if (status === 'alreadyInvited') {
        return {
            text: profile.name + ' is already invited to join this group!'
        }
    } else {
        throw new Error();
    }
};