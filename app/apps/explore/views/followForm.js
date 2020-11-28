/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTemplate('modal-text');

    x.setTitle('Follow posts');

    var typedID = args.id;
    var parsedTypedID = x.parseTypedID(typedID);

    x.add(x.makeProfilePreviewComponent(parsedTypedID.type, parsedTypedID.id, {
        theme: 'light',
        mode: 'simple',
        imageSize: 150
    }));

    var isFollowing = await library.isFollowing(parsedTypedID.type, parsedTypedID.id);
    if (parsedTypedID.type === 'user') {
        x.add(x.makeText(isFollowing ? 'This profile\'s posts are visible in your Explore screen.' : 'Get all the posts from this profile in your Explore screen.', true));
    } else {
        x.add(x.makeText(isFollowing ? 'This group\'s posts are visible in your Explore screen.' : 'Get all the posts from this group in your Explore screen.', true));
    }

    if (isFollowing) {
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