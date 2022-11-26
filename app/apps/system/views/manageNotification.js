/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var action = args.action;
    var serviceData = args.serviceData;

    x.setTitle('Notifications');

    x.add(x.makeIcon('notification'));

    x.add(x.makeText(args.text, { align: 'center' }));

    var call = async () => {
        x.showLoading();
        await x.services.call(serviceData.appID, serviceData.name, serviceData.args);
        //await x.backPrepare();
        await x.back();
    };
    x.add(x.makeButton(action === 'add' ? 'Enable' : 'Disable', async () => {
        await call();
    }, { marginTop: 'big' }));
};
