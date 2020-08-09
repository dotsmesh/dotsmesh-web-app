/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

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