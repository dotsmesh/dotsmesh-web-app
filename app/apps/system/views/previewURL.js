/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    var url = args.url !== undefined ? args.url : '';
    var title = args.title !== undefined ? args.title : '';

    x.setTitle('Open link');
    x.setTemplate('modal-text');

    x.add(x.makeText('You are about to visit the following website:'));
    if (title.length > 0) {
        x.add(x.makeText('Title:' + "\n" + title));
    }
    if (url.indexOf('://') === -1) {
        url = 'https://' + url;
    }
    x.add(x.makeText('URL:' + "\n" + url));
    x.add(x.makeButton('Open', async () => {
        await x.openURL(url);
        await x.back();
    }));
};