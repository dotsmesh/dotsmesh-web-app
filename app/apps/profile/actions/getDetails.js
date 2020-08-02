async (args, library) => {
    var details = args.details;
    var imageSize = typeof args.imageSize !== 'undefined' ? args.imageSize : null;
    var profile = await x.property.getProfile(args.propertyType, args.propertyID);
    var result = {};
    for (var i = 0; i < details.length; i++) {
        var detail = details[i];
        result[detail] = profile[detail];
    }
    if (imageSize !== null) {
        result['image'] = await profile.getImage(imageSize);
    }
    return result;
};