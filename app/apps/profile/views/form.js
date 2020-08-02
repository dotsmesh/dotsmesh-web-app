async (args, library) => {
    x.setTitle(args.title !== undefined ? args.title : 'Edit profile');

    var propertyType = null;
    var propertyID = null;
    var defaultImage = null;
    if (args.userID !== undefined) { // USER
        propertyType = 'user';
        propertyID = args.userID;
        if (propertyID !== x.currentUser.getID()) {
            throw new Error();
        }
        defaultImage = x.getDefaultUserImage(propertyID);
    } else if (args.groupID !== undefined) { // GROUP
        propertyType = 'group';
        propertyID = args.groupID;
        defaultImage = x.getDefaultGroupImage()
    } else if (args.groupUserID !== undefined) { // GROUP MEMBER
        propertyType = 'groupMember';
        propertyID = args.groupUserID;
        defaultImage = x.getDefaultUserImage(propertyID);
    }

    if (propertyType === null || propertyID === null) {
        throw new Error();
    }

    var argImage = args.image !== undefined ? args.image : null;
    var argName = args.name !== undefined ? args.name : null;
    var argDescription = args.description !== undefined ? args.description : null;

    var fieldImage = x.makeFieldImage('Image', {
        emptyValue: await x.image.make(defaultImage, 1, 1, 1)
    });
    x.add(fieldImage);

    var fieldName = x.makeFieldTextbox('Name', { maxLength: 100 });
    x.add(fieldName);

    var fieldDescription = x.makeFieldTextarea('Description', { maxLength: 1000 });
    x.add(fieldDescription);

    x.add(x.makeButton(args.buttonText !== undefined ? args.buttonText : 'Save Changes', async () => {
        x.showLoading();
        var data = {
            image: fieldImage.getValue(),
            name: fieldName.getValue(),
            description: fieldDescription.getValue()
        };
        if (args.callServiceBefore !== undefined) {
            var service = args.callServiceBefore;
            await x.services.call(service.appID, service.name, service.args);
        }
        await library.setData(propertyType, propertyID, data);
        await x.back('saved');
    }));

    x.wait(async () => {
        var data = await library.getData(propertyType, propertyID);
        fieldImage.setValue(argImage !== null ? argImage : data.image);
        fieldName.setValue(argName !== null ? argName : data.name);
        fieldDescription.setValue(argDescription !== null ? argDescription : data.description);
    });
};