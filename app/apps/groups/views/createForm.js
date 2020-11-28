/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTitle('New group');

    x.add(x.makeProfilePreviewComponent('group', null, {
        theme: 'light',
        mode: 'image',
        imageSize: 80
    }));

    x.add(x.makeText('Just like the public profiles, a group requires a group key. It points to the place where your data will be stored. Get one at <a onclick="x.openURL(\'https://hosting.dotsmesh.com/\');">hosting.dotsmesh.com</a>.\n\nAlready got one?', true, true));

    var fieldGroupKey = x.makeFieldTextbox(null, { placeholder: 'Group key', align: 'center', maxLength: 200 });
    x.add(fieldGroupKey);

    x.add(x.makeButton('Create', async () => {
        x.showLoading();
        var groupKey = fieldGroupKey.getValue();
        try {
            var groupID = await library.createGroup(groupKey);
            await x.back(groupID);
        } catch (e) {
            x.hideLoading();
            x.showMessage('The group key is not valid!');
            // if (['invalidInvitationCode', 'networkError'].indexOf(e.name) !== -1) {
            //     x.showMessage('The hosting key is not valid!');
            // } else {
            //     throw e;
            // }
        };
    }));

}