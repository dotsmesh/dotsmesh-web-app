/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {

    var url = args.url !== undefined && args.url !== null ? args.url : '';
    var title = args.title !== undefined && args.title !== null ? args.title : '';

    x.setTitle(url.length > 0 ? 'Modify link' : 'Create link');

    var fieldURL = x.makeFieldTextbox('URL', { placeholder: 'https://' });
    fieldURL.setValue(url);
    x.add(fieldURL);

    var fieldTitle = x.makeFieldTextbox('Title');//, { placeholder: 'optional' }
    fieldTitle.setValue(title);
    x.add(fieldTitle);

    x.add(x.makeButton('Apply', async () => {
        x.back({
            url: fieldURL.getValue(),
            title: fieldTitle.getValue(),
        });
    }));
};