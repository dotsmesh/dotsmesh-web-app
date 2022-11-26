/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    var text = args.text;
    var options = args.options;
    var icon = options.icon !== undefined ? options.icon : null;

    if (icon !== null) {
        x.add(x.makeIcon(icon));
    }

    x.add(x.makeText(text, { align: 'center', marginTop: 'modalFirst' }));

    x.add(x.makeButton('OK', async () => {
        await x.back('ok');
    }, { marginTop: 'big' }));
    x.add(x.makeButton('Cancel', async () => {
        await x.back();
    }));

};