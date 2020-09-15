/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    var url = args.url !== undefined ? args.url : '';
    var title = args.title !== undefined ? args.title : '';

    x.setTitle('Open link');

    x.add(x.makeText('You are about to open an external link:'));
    if (title.length > 0) {
        x.add(x.makeText(title));
    }
    x.add(x.makeText(url));
    x.add(x.makeButton('Open', () => {
        x.openURL(url);
        x.back();
    }));
};