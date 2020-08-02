async (args, library) => {

    var propertyType = null;
    var propertyID = null;
    if (typeof args.userID !== 'undefined') { // USER
        propertyType = 'user';
        propertyID = args.userID;
        x.setTitle('New public post');
    } else if (typeof args.groupID !== 'undefined') { // GROUP
        propertyType = 'group';
        propertyID = args.groupID;
        var profile = await x.group.getProfile(propertyID);
        x.setTitle('New post in ' + profile.name);
    }

    var attachment = typeof args.attachment !== 'undefined' ? x.attachment.unpack(null, args.attachment.value) : null;

    x.add(x.makeComponent(async () => {
        var post = x.posts.make();
        if (attachment !== null) {
            post.attachments.add(attachment);
        }
        var options = {};
        options.placeholder = 'What will you share today?'; // todo random texts
        if (propertyType === 'group') {
            options.profilePropertyType = 'groupMember';
            options.profilePropertyID = propertyID + '$' + x.currentUser.getID();
        }
        var postForm = await x.makePostForm(post, options);
        postForm.onSubmit = async post => {
            x.showLoading();
            await library.addPost(propertyType, propertyID, post);
            //await x.backPrepare();
            await x.back(null, { closeAllModals: true }); // needed for the share windows { status: 'posted' }
        };
        return postForm;
    }));
}