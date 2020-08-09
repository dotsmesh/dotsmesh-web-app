/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTitle('Add contact');

    var fieldID = x.makeFieldTextbox('ID or connect key');
    x.add(fieldID);
    fieldID.focus();

    x.add(x.makeButton('Search', async () => {
        x.showLoading();
        var value = fieldID.getValue().toLowerCase();
        var parts = value.split('/');
        if (parts.length === 2) {
            var id = x.getFullID(parts[0]);
            var connectKey = parts[1]; // todo validate
        } else {
            var id = x.getFullID(value);
            var connectKey = null;
        }
        if (!x.isPublicID(id)) {
            x.hideLoading();
            x.alert('The ID provided is not valid!');
            return;
        }
        x.open('user/home', { userID: id, connectKey: connectKey });
    }));
};