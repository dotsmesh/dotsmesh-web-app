async (args, library) => {
    var groupID = args.groupID;
    var userID = args.userID;
    x.setTitle('Remove a member?');

    x.add(x.makeText('Are you sure, you want to remove this member from the group?', true));

    x.add(x.makeButton('Yes, remove!', async () => {
        x.showLoading();
        await library.removeMember(groupID, userID);
        await x.back('removed');
    }));

};