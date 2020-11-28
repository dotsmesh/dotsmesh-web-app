/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    var text = args.text;
    var icon = args.icon;

    x.setTemplate('modal-text');

    if (icon !== null) {
        x.add(x.makeIcon(icon));
    }

    x.add(x.makeText(text, true));

    var container = x.makeContainer();
    container.add(x.makeButton('OK', async () => {
        await x.back('ok');
    }));
    container.add(x.makeButton('Cancel', async () => {
        await x.back();
    }));
    x.add(container);

};