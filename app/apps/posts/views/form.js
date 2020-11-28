/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    var postID = args.postID !== undefined ? args.postID : null;
    var editMode = postID !== null;

    var propertyType = null;
    var propertyID = null;
    if (args.userID !== undefined) { // USER
        propertyType = 'user';
        propertyID = args.userID;
        x.setTitle(editMode ? 'Edit post' : 'New public post');
    } else if (args.groupID !== undefined) { // GROUP
        propertyType = 'group';
        propertyID = args.groupID;
        var profile = await x.group.getProfile(propertyID);
        x.setTitle(editMode ? 'Edit post' : 'New post in ' + profile.name);
    }

    var attachment = args.attachment !== undefined ? x.attachment.unpack(null, args.attachment.value) : null;

    x.add(x.makeComponent(async () => {
        if (editMode) {
            var post = await library.getPost(propertyType, propertyID, postID, { cache: false });
        } else {
            var post = x.posts.make();
            if (attachment !== null) {
                post.attachments.add(attachment);
            }
        }
        var options = {};
        //options.placeholder = 'What will you share today?'; // todo random texts
        if (propertyType === 'group') {
            options.profilePropertyType = 'groupMember';
            options.profilePropertyID = propertyID + '$' + x.currentUser.getID();
        }
        var postForm = await x.makePostForm(post, options);
        postForm.onSubmit = async post => {
            x.showLoading();
            await library.setPost(editMode, propertyType, propertyID, post);
            await x.back(null, { closeAllModals: true }); // needed for the share windows { status: 'posted' }
        };
        return postForm;
    }));
}