/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    try {
        x.setTitle('About');

        x.add(x.makeText('Dots Mesh is and open social platform. Visit about.dotsmesh.com for all the details.'));
        x.add(x.makeText('The source code of this web app is available at github.com/dotsmesh'));
        x.add(x.makeText('App version: ' + x.version));
        x.add(x.makeButton('OK', async () => {
            await x.back();
        }));
    } catch (e) {
        // prevent errors here
    }
};
