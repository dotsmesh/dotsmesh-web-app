/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTitle('Add contact');

    x.add(x.makeText('Every public profile has a unique ID. Enter the ID of the profile you are looking for.'));

    var fieldID = x.makeFieldTextbox('', { placeholder: 'ID' });
    x.add(fieldID);
    fieldID.focus();

    x.add(x.makeButton('Search', async () => {
        x.showLoading();
        var value = fieldID.getValue().toLowerCase();
        var id = x.getFullID(value);
        if (!x.isPublicID(id)) {
            x.hideLoading();
            x.showMessage('The ID provided is not valid!');
            return;
        }
        var userProfile = await x.user.getProfile(id);
        if (!userProfile.exists) {
            x.hideLoading();
            x.showMessage('There is now such profile!');
            return;
        }
        x.open('user/home', { userID: id });
    }));
};