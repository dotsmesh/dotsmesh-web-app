/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var text = args.text;

    x.setTemplate('modal-text');
    x.add(x.makeText(text, true));

    x.add(x.makeButton('OK', async () => {
        //await x.backPrepare();
        await x.back();
    }));
};
