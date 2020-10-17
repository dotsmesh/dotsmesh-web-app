/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

self.x = {};
self.importScripts('?app&a');

self.addEventListener('push', async event => {
    //var payload = event.data ? event.data.text() : null;
    x.library.load(['utilities', 'core']);
    if (await x.currentUser.autoLogin()) {
        await x.runBackgroundTasks();
    }
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    var notificationData = event.notification.data;
    event.waitUntil(async function () {
        var allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
        var clientToUse = null;
        for (var client of allClients) {
            client.focus();
            clientToUse = client;
            break;
        }
        if (!clientToUse) {
            clientToUse = await clients.openWindow('/'); // todo open notification
        }
        if (clientToUse) {
            await clientToUse.postMessage({ type: 'notificationClick', data: notificationData });
        }
    }());
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
    );
});