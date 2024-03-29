/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var key = args.key !== undefined ? args.key : null;
    var resultMode = key !== null;

    x.add(x.makeIcon('key'));

    if (resultMode) {
        x.setTitle('Key details');
    } else {
        x.setTitle('New connection key');

        x.add(x.makeText('Your secret key may contain letters and numbers only.', { align: 'center' }));
    }

    var currentUserID = x.getShortID(x.currentUser.getID());

    var fieldKey = x.makeFieldTextbox(resultMode ? 'Secret key' : '', {
        readonly: resultMode,
        uppercase: true,
        align: resultMode ? null : 'center',
        placeholder: 'secret key'
    });
    x.add(fieldKey);
    if (resultMode) {
        fieldKey.setValue(key);
    }

    if (resultMode) {
        var fieldURL = x.makeFieldTextarea('URL', { readonly: true, breakWords: true });
        x.add(fieldURL);
        fieldURL.setValue('https://dotsmesh.com/#' + currentUserID + '/c/' + key);
    }

    if (resultMode) {
        x.add(x.makeButton('OK', () => {
            x.back();
        }, { marginTop: 'big' }));
        x.addToolbarButton('Delete this connection key', async () => {
            if (await x.confirm('Are you sure you want to delete this connection key?')) {
                x.showLoading();
                await library.deleteConnectKey(key);
                //await x.backPrepare();
                await x.back();
            }
        }, 'delete');
    } else {
        var container = x.makeContainer();
        container.add(x.makeButton('Create', async () => {
            var key = fieldKey.getValue().trim().toLowerCase();
            if (key.length === 0) {
                fieldKey.focus();
                // x.hideLoading();
                // x.alert('The key cannot be empty!');
                return;
            }
            x.showLoading();
            if (key.length > 200) {
                x.hideLoading();
                x.alert('The key cannot be longer than 200 chars!');
                return;
            }
            if (key.match(/^[a-z0-9]+$/) === null) {
                x.hideLoading();
                x.alert('The key must contain only letters and numbers!');
                return;
            }
            if (await library.getConnectKey(key) !== null) {
                x.hideLoading();
                x.alert('There is such key already!');
                return;
            }
            await library.setConnectKey(key);
            await x.back();
        }, { marginTop: 'big' }));
        x.add(container);
    }
};