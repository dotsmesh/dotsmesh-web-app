async (args, library) => {
    var apps = args.apps;
    //if (x.currentUser.exists()) {
    //var profile = await x.user.getProfile(x.currentUser.getID());

    var container = x.makeContainer();
    for (var app of apps) {
        container.add(x.makeButton(app.name, (app => {
            x.open(app.id + '/home');
        }).bind(this, app)));
    }
    x.add(container);
    //}

};