/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTitle('Follow posts');

    var typedID = args.id;
    var parsedTypedID = x.parseTypedID(typedID);

    if (parsedTypedID.type === 'user') {
        x.add(x.makeText('Get all the posts from this profile in your Explore screen.', true));
    } else {
        x.add(x.makeText('Get all the posts from this group in your Explore screen.', true));
    }

    // var attachment = x.attachment.make();
    // attachment.type = parsedTypedID.type === 'user' ? 'u' : 'g'; // todo optimize
    // attachment.value = { i: parsedTypedID.id };
    // x.add(x.makeAttachmentPreviewComponent(attachment));

    if (await library.isFollowing(parsedTypedID.type, parsedTypedID.id)) {
        x.add(x.makeButton('Unfollow', async () => {
            x.showLoading();
            await library.unfollow(parsedTypedID.type, parsedTypedID.id);
            //await x.backPrepare();
            await x.back();
        }));
    } else {
        x.add(x.makeButton('Follow', async () => {
            x.showLoading();
            await library.follow(parsedTypedID.type, parsedTypedID.id);
            //await x.backPrepare();
            await x.back();
        }));
    }

}