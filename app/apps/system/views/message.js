async (args, library) => {
    var text = args.text;

    x.add(x.makeText(text, true));

    x.add(x.makeButton('OK', async () => {
        //await x.backPrepare();
        await x.back();
    }));
};
