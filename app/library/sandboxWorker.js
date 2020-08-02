(x) => {

    // MESSAGING

    let channel = x.createMessagingChannel('worker-window');
    channel.addListener('run', async args => {
        return await self.main(args);
    });

    x.proxyCall = async (method, ...args) => {
        return await channel.send('call', {
            method: method,
            args: args
        });
    };

}