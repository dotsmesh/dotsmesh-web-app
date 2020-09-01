/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    x.setTitle('Request from everyone');

    x.add(x.makeText('When allowed, everyone will be able to send you connection requests.'));

    var anonymousConnectIsAllowed = await library.getOpenConnectStatus();

    var fieldAllow = x.makeFieldCheckbox('Allow');
    x.add(fieldAllow);
    fieldAllow.setChecked(anonymousConnectIsAllowed);

    x.add(x.makeButton('Save changes', async () => {
        x.showLoading();
        await library.setOpenConnectStatus(fieldAllow.isChecked());
        await x.back();
    }));
};