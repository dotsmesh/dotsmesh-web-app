/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

(x, sourceCode) => {
    x.library = {};

    x.library.load = modules => {
        modules.forEach(module => {
            if (typeof sourceCode[module] !== 'string') {
                sourceCode[module] = sourceCode[module].toString();
            }
            ((new Function('return ' + sourceCode[module]))())(x);
        });
    };

    x.library.get = (modules, xLocation) => {
        var result = '';
        modules.forEach(module => {
            if (typeof sourceCode[module] !== 'string') {
                sourceCode[module] = sourceCode[module].toString();
            }
            result += '(' + sourceCode[module] + ')(' + xLocation + ');';
        });
        return result;
    };

    x.library.getApps = () => {
        return sourceCode.apps;
    };

};