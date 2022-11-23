/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var groupID = args.groupID;
    x.setTitle('Invitation URL');

    x.add(x.makeText('Send the following URL to the people you want to invite to this group:'));

    var fieldURL = x.makeFieldTextarea('', { readonly: true, breakWords: true });
    x.add(fieldURL);

    x.add(x.makeButton('OK', () => {
        x.back(null, { closeAllModals: true });
    }));

    x.showLoading();
    (async () => {
        var result = await x.services.call('groups', 'getInvitationURL', { groupID: groupID });
        fieldURL.setValue('https://dotsmesh.com/#g:' + result);
        x.hideLoading();
    })();

};