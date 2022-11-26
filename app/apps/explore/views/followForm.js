/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTitle('Follow posts');

    var typedID = args.id;
    var parsedTypedID = x.parseTypedID(typedID);

    x.add(x.makeProfilePreviewComponent(parsedTypedID.type, parsedTypedID.id, {
        theme: 'light',
        size: 'medium'
    }));

    var isFollowing = await library.isFollowing(parsedTypedID.type, parsedTypedID.id);
    if (parsedTypedID.type === 'user') {
        x.add(x.makeText(isFollowing ? 'This profile\'s posts are visible in your Explore screen.' : 'Get all the posts from this profile in your Explore screen.', { align: 'center' }));
    } else {
        x.add(x.makeText(isFollowing ? 'This group\'s posts are visible in your Explore screen.' : 'Get all the posts from this group in your Explore screen.', { align: 'center' }));
    }

    x.add(x.makeButton(isFollowing ? 'Unfollow' : 'Follow', async () => {
        x.showLoading();
        if (isFollowing) {
            await library.unfollow(parsedTypedID.type, parsedTypedID.id);
        } else {
            await library.follow(parsedTypedID.type, parsedTypedID.id);
        }
        await x.back();
    }, { marginTop: 'big' }));

}