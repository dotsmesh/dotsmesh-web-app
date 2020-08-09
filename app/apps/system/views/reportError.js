/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

async (args, library) => {
    try {
        var error = args.error;
        var errorText = '';
        try {
            errorText = [];
            var jsData = JSON.parse(error);
            errorText.push('location:\n' + jsData.location);
            errorText.push('date:\n' + jsData.date);
            errorText.push('name:\n' + jsData.name);
            for (var k in jsData.details) {
                var value = jsData.details[k];
                if (typeof value !== 'string' && typeof value !== 'number') {
                    value = JSON.stringify(value);
                }
                errorText.push(k + ':\n' + value);
            }
            errorText = errorText.join('\n\n');
        } catch (e) {
            errorText = error;
        }
        x.setTitle('Oops, an error occurred!');

        x.add(x.makeHint('You can help the Dots Mesh developers fix this problem by sending them the following text:'));

        var fieldTextarea = x.makeFieldTextarea('', { height: '400px', readonly: true });
        fieldTextarea.setValue(errorText);
        x.add(fieldTextarea);

        x.add(x.makeButton('Submit error report', async () => {
            x.showLoading();
            try {
                await fetch('https://about.dotsmesh.com/logAppError', {
                    method: 'POST',
                    cache: 'no-cache',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    referrerPolicy: 'no-referrer',
                    body: JSON.stringify({ content: errorText })
                });
            } catch (e) {

            }
            x.back();
        }));
    } catch (e) {
        // prevent errors here
    }
};
