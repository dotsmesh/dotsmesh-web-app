/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    x.setTitle('Request from everyone');

    x.add(x.makeIcon('globe'));

    var allowed = await library.getOpenConnectStatus();
    x.add(x.makeText(allowed ? 'Everyone is allowed to send you connection requests.' : 'Connection requests from everyone are disabled.', { align: 'center' }));
    x.add(x.makeButton(allowed ? 'Disable' : 'Enable', async () => {
        x.showLoading();
        if (allowed) {
            await library.setOpenConnectStatus(false);
        } else {
            await library.setOpenConnectStatus(true);
        }
        await x.back();
    }, { marginTop: 'big' }));
};