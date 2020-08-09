/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    x.setTitle('Select recipient');
    var fieldRecipient = x.addFieldTextbox('Recipient');
    fieldRecipient.focus();
    x.addSaveButton(async () => {
        var recipientID = fieldRecipient.getValue();
        var threadID = await library.getOrMakeThreadID([recipientID]);
        x.open('thread', { 'threadID': threadID });
    });
};