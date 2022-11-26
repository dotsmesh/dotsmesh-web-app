/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTitle('New contact');

    x.add(x.makeIcon('search'));

    x.add(x.makeText('Every public profile has a unique ID. Enter the ID of the profile you are looking for.', { align: 'center' }));

    var fieldID = x.makeFieldTextbox('', { placeholder: 'ID', align: 'center' });
    x.add(fieldID);

    x.add(x.makeButton('Search', async () => {
        var value = fieldID.getValue().trim().toLowerCase();
        if (value.length === 0) {
            fieldID.focus();
            return;
        }
        x.showLoading();
        var id = x.getFullID(value);
        if (!x.isPublicID(id)) {
            x.hideLoading();
            x.showMessage('The ID provided is not valid!');
            return;
        }
        var userProfile = await x.user.getProfile(id);
        if (!userProfile.exists) {
            x.hideLoading();
            x.showMessage('There is no such profile!');
            return;
        }
        x.open('user/home', { userID: id });
    }, { marginTop: 'big' }));
};