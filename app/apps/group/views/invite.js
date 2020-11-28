/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    var groupID = args.id;
    x.setTitle('Invite');

    x.setTemplate('modal-text');

    x.add(x.makeProfilePreviewComponent('group', groupID, {
        theme: 'light',
        mode: 'simple',
        imageSize: 150
    }));

    x.add(x.makeText('Invite new members to this group.', true));

    var container = x.makeContainer();

    if (x.currentUser.isPublic()) {
        container.add(x.makeButton('Invite a contact', async () => {
            x.pickContact(null, {
                service: {
                    appID: 'groups',
                    name: 'invitePickedContact',
                    args: { groupID: groupID }
                },
                closeAllModals: true
            });
        }));
    }

    container.add(x.makeButton('Get invitation URL', () => {
        x.open('group/inviteGetURL', { groupID: groupID }, { modal: true, width: 400 })
        // var result = await x.services.call('groups', 'getInvitationURL', { groupID: groupID });
        // //x.alert('https://dotsmesh.com/#g:' + result);
        // x.add(x.makeText('https://dotsmesh.com/#g:' + result));
    }));

    x.add(container);

};