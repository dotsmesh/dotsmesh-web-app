/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var userID = args.userID;

    x.setTitle('Do you have a key?');

    x.add(x.makeIcon('key'));

    x.add(x.makeText('You\'ll need a key to send your connection request to this profile. This is an anti-spam mechanism.', { align: 'center' }));

    var fieldKey = x.makeFieldTextbox(null, {
        placeholder: 'secret key',
        align: 'center',
        uppercase: true
    });
    x.add(fieldKey);

    x.add(x.makeButton('Send connection request', async () => {
        x.showLoading();
        var key = fieldKey.getValue();
        var result = await library.sendRequest(userID, 'k/' + key);
        if (!result) {
            result = await library.sendRequest(userID, key);
        }
        x.hideLoading();
        if (result === true) {
            x.showMessage('Connection request sent!');
        } else {
            x.showMessage('Sorry! The connection key is not valid!');
        }
    }, { marginTop: 'big' }));
};