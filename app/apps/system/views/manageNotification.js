/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var action = args.action;
    var serviceData = args.serviceData;


    x.add(x.makeText(args.text, true));

    var call = async () => {
        x.showLoading();
        await x.services.call(serviceData.appID, serviceData.name, serviceData.args);
        //await x.backPrepare();
        await x.back();
    };
    if (action === 'add') {
        x.add(x.makeButton('Enable', async () => {
            await call();
        }));
    } else {
        x.add(x.makeButton('Disable', async () => {
            await call();
        }));
    }
};
