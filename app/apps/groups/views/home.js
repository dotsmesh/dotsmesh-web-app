/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTitle('Groups');

    x.add(x.makeTitle('Groups', {
        buttonOnClick: async () => {
            var groupID = await x.open('groups/createForm', {}, { modal: true, width: 300 });
            if (groupID !== null) {
                x.open('group/home', { id: groupID });
            }
        }
    }));

    // x.add(x.makeIconButton(async () => {
    //     var groupID = await x.open('groups/createForm', {}, { modal: true, width: 300 });
    //     if (groupID !== null) {
    //         x.open('group/home', { id: groupID });
    //     }
    // }, 'x-icon-plus-white', 'New group'));//, null, true

    var component = x.makeComponent(async () => {
        var groups = await library.getList(['status']);
        var groupsCount = Object.keys(groups).length;
        if (groupsCount === 0) {
            var container = x.makeContainer(true);
            container.add(x.makeHint('Groups are a great place to share, collaborate, discuss, or just have fun with others.'));
            // container.add(x.makeSmallTitle('Want to try one?'));
            // container.add(x.makeHint('There is a private demo group you can join to take a look this feature of the platform. Get a hosting key to create your own.'));
            // container.add(x.makeButton('Visit', async () => {
            //     x.showLoading();
            //     var groupID = 'oofiy12zxb5vvg7.xbg.dotsmesh.com';
            //     await x.services.call('groups', 'addURLInvitation', { groupID: groupID, accessKey: 'noktu0add35v6f76n27nmrbifgq8rvxjuhbayxozgwuq3y0a3ri9rgf' });
            //     await x.open('group/home', { id: groupID });
            // }, { style: 'style2' }));
            return container;
        } else {
            var list = x.makeList({ type: 'grid' });
            for (let groupID in groups) {
                var groupDetails = groups[groupID];
                //var status = groupDetails['status'];
                list.add(await x.makeProfileButton('group', groupID));
                component.observeChanges(['group/' + groupID + '/profile']);
            }
            return list;
        }
    });
    component.observeChanges(['groups']);
    x.add(component);
};