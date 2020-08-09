/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var key = typeof args.key !== 'undefined' ? args.key : null;
    var resultMode = typeof args.resultMode !== 'undefined';
    var editMode = key !== null;
    if (resultMode) {
        x.setTitle('Key details');
    } else {
        x.setTitle(editMode ? 'Edit a connect key' : 'New connect key');
    }

    if (!resultMode) {
        var fieldName = x.makeFieldTextbox('Name');
        x.add(fieldName);

        if (editMode) {
            var data = await library.getConnectKey(key);
            fieldName.setValue(data.name);
        }
    }

    if (editMode || resultMode) {
        var currentUserID = x.getShortID(x.currentUser.getID());
        var fieldKey = x.makeFieldTextbox('Key', { readonly: true });
        x.add(fieldKey);
        fieldKey.setValue(currentUserID + '/' + key);

        var fieldURL = x.makeFieldTextarea('URL', { readonly: true });
        x.add(fieldURL);
        fieldURL.setValue('https://dotsmesh.com/#' + currentUserID + '/c/' + key);
    }

    // var fieldKey = x.makeFieldTextbox('Key');
    // x.add(fieldKey);

    if (resultMode) {
        x.add(x.makeButton('OK', () => {
            x.back();
        }))
    } else {
        var container = x.makeContainer();
        container.add(x.makeButton(editMode ? 'Save changes' : 'Create', async () => {
            x.showLoading();
            var name = fieldName.getValue().trim();
            //var key = fieldKey.getValue().toLowerCase().trim(); // validate
            var _key = await library.setConnectKey(key, name);
            //await x.backPrepare();
            await x.back();
            if (editMode) {
                //await x.backPrepare();
                await x.back();
            } else {
                x.open('contacts/connectKeyForm', { key: _key, resultMode: true }, { modal: true, width: 300 });
            }
        }));

        if (editMode) {
            container.add(x.makeButton('Delete', async () => {
                if (await x.confirm('Sure?')) {
                    x.showLoading();
                    await library.deleteConnectKey(key);
                    //await x.backPrepare();
                    await x.back();
                }
            }));
        }
        x.add(container);
    }
};