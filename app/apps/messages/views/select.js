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