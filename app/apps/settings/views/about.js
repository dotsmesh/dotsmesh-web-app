/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    try {
        x.setTitle('About');

        x.add(x.makeText('Dots Mesh is an open social platform. Visit <a onclick="x.openURL(\'https://about.dotsmesh.com/\');">about.dotsmesh.com</a> for all the details.', false, true));
        x.add(x.makeText('The source code of this web app is available at <a onclick="x.openURL(\'https://github.com/dotsmesh/\');">github.com/dotsmesh</a>', false, true));
        x.add(x.makeText('App version: ' + x.version));
        x.add(x.makeButton('OK', async () => {
            await x.back();
        }));
    } catch (e) {
        // prevent errors here
    }
};
