/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    x.setTitle('Request from everyone');

    x.add(x.makeIcon('globe'));

    var anonymousConnectIsAllowed = await library.getOpenConnectStatus();
    if (anonymousConnectIsAllowed) {
        x.add(x.makeText('Everyone is allowed to send you connection requests.', true));
        x.add(x.makeButton('Disable', async () => {
            x.showLoading();
            await library.setOpenConnectStatus(false);
            await x.back();
        }));
    } else {
        x.add(x.makeText('Connection requests from everyone are disabled.', true));
        x.add(x.makeButton('Enable', async () => {
            x.showLoading();
            await library.setOpenConnectStatus(true);
            await x.back();
        }));
    }

    // x.add(x.makeText('When allowed, everyone will be able to send you connection requests.'));

    // var anonymousConnectIsAllowed = await library.getOpenConnectStatus();

    // var fieldAllow = x.makeFieldCheckbox('Allow');
    // x.add(fieldAllow);
    // fieldAllow.setChecked(anonymousConnectIsAllowed);

    // x.add(x.makeButton('Save changes', async () => {
    //     x.showLoading();
    //     await library.setOpenConnectStatus(fieldAllow.isChecked());
    //     await x.back();
    // }));
};