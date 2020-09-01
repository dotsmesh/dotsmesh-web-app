/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

(x) => {

    var modal = document.body.getAttribute('x-type') === 'modal';
    var title = null;
    var hash = null;
    var observers = [];
    var promisesToWait = [];

    var openActionResolve = null;

    var errorHandlers = [];

    x.windowEvents = x.makeEventTarget();

    var hasShownAnErrorMessage = false; // prevents message button that announce changes (remove group for example) that updates the content of this window
    var showErrorMessage = error => { // returns an error to throw
        if (hasShownAnErrorMessage) {
            return null;
        }
        var error = x.makeAppError(error);
        if (errorHandlers[error.name] !== undefined) {
            errorHandlers[error.name](); // async call
            hasShownAnErrorMessage = true;
            return null;
        } else {
            try { // There might be an error before this file is executed
                x.showMessage('');
            } catch (e) {
                // ignore
            }
        }
        return error;
    };

    var lastAccessibleValue = true;
    var setAccessibility = accessible => {
        if (lastAccessibleValue !== accessible) {
            lastAccessibleValue = accessible;
            var elements = document.querySelectorAll('[tabindex]');
            for (var element of elements) {
                element.setAttribute('tabindex', accessible ? '0' : '-1');
            }
            document.body.setAttribute('aria-hidden', accessible ? 'false' : 'true');
        }
    };

    // MESSAGING

    var channel = x.createMessagingChannel('iframe-window');
    channel.addListener('initialize', async args => {
        try {
            x.sandboxEvents.addEventListener('error', e => {
                var errorToThrow = showErrorMessage(e.detail.error);
                if (errorToThrow === null) {
                    e.preventDefault();
                }
            });
            if (modal) {
                x.addToolbarButton('Close', async () => {
                    x.back();
                }, 'close', 'right', 999);
            } else {
                if (args.showBackButton) {
                    x.addToolbarButton('Back', async () => {
                        x.back();
                    }, 'back', 'left', -1);
                }
            }
            if (args.width !== null) {
                setWidth(args.width);
            }
            await self.main(args.args);
        } catch (e) {
            var errorToThrow = showErrorMessage(e);
            if (errorToThrow !== null) {
                throw errorToThrow;
            }
        }
    });
    var loadingIndicatorTimeout = null;
    channel.addListener('show', async () => {
        if (!modal) {
            loadingIndicatorTimeout = setTimeout(() => {
                var loadingIndicator = document.querySelector('.x-loading');
                loadingIndicator.setAttribute('x-visible', '1');
            }, 1000);
        }
        try {
            await Promise.all(promisesToWait);
            x.windowEvents.dispatchEvent(new CustomEvent('beforeShow'));
            document.body.setAttribute('x-visible', '1');
            if (modal) {
                window.focus();
                self.addEventListener('keydown', e => {
                    if (e.keyCode == 27) {
                        if (document.body.getAttribute('x-loading') === '1') {
                            return;
                            // todo handle window unload event too
                        }
                        x.back();
                        return false;
                    }
                }, true);
            }
            x.windowEvents.dispatchEvent(new CustomEvent('show'));
            setAccessibility(true);
        } catch (e) {
            var errorToThrow = showErrorMessage(e);
            if (errorToThrow !== null) {
                throw errorToThrow;
            }
        }
        return {
            title: title,
            hash: hash
        };
    });
    channel.addListener('hide', () => {
        if (!modal) {
            clearTimeout(loadingIndicatorTimeout);
            var loadingIndicator = document.querySelector('.x-loading');
            loadingIndicator.removeAttribute('x-visible');
        }
        return new Promise((resolve, reject) => {
            try {
                setAccessibility(false);
                document.body.removeAttribute('x-visible');
                setTimeout(resolve, x.modalsAnimationTime + 16);
            } catch (e) {
                reject(e);
            }
        });
    });
    channel.addListener('setAccessibility', args => {
        setAccessibility(args.accessible);
    });

    var updateOnAnnouncedChanges = async keys => {
        var promises = [];
        for (var observer of observers) {
            var observedKeys = observer[1]();
            if (x.arrayIntersect(observedKeys, keys).length === 0) { // no need to update
                continue;
            }
            promises.push(observer[0]());
        }
        if (promises.length > 0) {
            await Promise.all(promises);
            x.windowEvents.dispatchEvent(new CustomEvent('update'));
        }
    };

    channel.addListener('update', async announcedChanges => {
        try {
            var keys = [];
            announcedChanges.forEach(change => {
                keys.push(change.key);
            });
            await updateOnAnnouncedChanges(keys);
        } catch (e) {
            var errorToThrow = showErrorMessage(e);
            if (errorToThrow !== null) {
                throw errorToThrow;
            }
        }
    });

    channel.addListener('openResult', async result => {
        if (openActionResolve !== null) {
            openActionResolve(result);
        }
    });

    x.sandboxEvents.addEventListener('announceChanges', async e => {
        var keys = e.detail.keys;
        await updateOnAnnouncedChanges(keys);
    });

    x.proxyCall = async (method, ...args) => {
        return await channel.send('call', {
            method: method,
            args: args
        });
    };

    window.addEventListener('resize', () => {
        var event = new CustomEvent('resize');
        x.windowEvents.dispatchEvent(event);
    });

    // todo minify
    x.loadingImage = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" version="1.1"><switch transform="translate(-47 290.1)"><g fill="#999"><g transform="matrix(7.04196 0 0 7.04196 -632.533 -694.475)" stroke-width="1.42"><path d="M105.728 75.884a9.212 9.212 0 01-9.23-9.23 9.212 9.212 0 019.23-9.23 9.212 9.212 0 019.23 9.23 9.212 9.212 0 01-9.23 9.23z"/><path d="M105.728 114.226a9.212 9.212 0 01-9.23-9.23 9.212 9.212 0 019.23-9.23 9.212 9.212 0 019.23 9.23 9.212 9.212 0 01-9.23 9.23z" fill="#999"/><path d="M144.07 114.226a9.212 9.212 0 01-9.23-9.23 9.212 9.212 0 019.23-9.23 9.212 9.212 0 019.23 9.23 9.212 9.212 0 01-9.23 9.23z" fill="#999"/><path d="M144.07 75.884a9.212 9.212 0 01-9.23-9.23 9.212 9.212 0 019.23-9.23 9.212 9.212 0 019.23 9.23 9.212 9.212 0 01-9.23 9.23z" fill="#999"/></g></g></switch></svg>');
    if (modal) {
        x.loadingImage = x.loadingImage.replace('#999', '#aaa');
    }

    var textStyle = 'font-size:15px;line-height:160%;';
    var titleStyle = 'font-size:19px;line-height:160%;font-family:' + x.fontFamily + ';font-weight:bold;';
    var smallTitleStyle = 'font-size:15px;line-height:160%;font-family:' + x.fontFamily + ';font-weight:bold;';
    var lightTextStyle = textStyle + 'color:#fafafa;';
    var darkTextStyle = textStyle + 'color:#000;';
    var lightThemeHintColor = '#777';
    var darkThemeHintColor = '#999';

    var css = '*,*:before,*:after{margin:0;padding:0;outline:none;-webkit-tap-highlight-color:rgba(0,0,0,0);-webkit-overflow-scrolling:touch;}';
    css += 'html,body{height:100vh;overflow:hidden;}';
    css += 'body,textarea,input{font-family:Helvetica,Arial,sans-serif;font-size:15px;}';
    css += '@media only screen and (min-width:800px){';
    css += '*{scrollbar-width:thin;scrollbar-color:' + (modal ? '#aaa' : '#666') + ' transparent;}';
    css += '*::-webkit-scrollbar{width:6px;}';
    css += '*::-webkit-scrollbar-track{background: transparent;}';
    css += '*::-webkit-scrollbar-thumb{background-color:' + (modal ? '#aaa' : '#666') + ';}';
    css += '}';

    // for (var icon in x.icons) {
    //     css += '.x-icon-' + icon + '{background-image:url(\'data:image/svg+xml;base64,' + btoa(x.icons[icon]) + '\')}';
    // }

    var contentSpacing = '15px';
    var contentSpacingInt = 15;
    var smallEdgeSpacing = '5px';
    var largeEdgeSpacing = '15px';
    var edgeContentSpacing = '10px'; // 15 - 5px // todo responsive maybe
    // var edgeSpacingInt = null;
    // var updateEdgeSpacing = () => {
    //     edgeSpacingInt = document.body.getClientRects()[0].width > 800 ? 15 : 5;
    // }
    // updateEdgeSpacing();
    // x.windowEvents.addEventListener('resize', updateEdgeSpacing);



    css += 'body{font-size:0;line-height:0;}';

    css += '@keyframes x-rotate{from{transform:rotate(0deg);}to{transform:rotate(359deg);}}';
    css += '.x-body{transition:opacity ' + (modal ? x.modalsAnimationTime : x.animationTime) + 'ms;opacity:1;position:relative;box-sizing:border-box;display:flex;align-items:flex-start;flex-direction:column;z-index:2;}' // align-items: flex-start; prevents stretching children
    css += 'body:not([x-visible]):not([x-message]) .x-body{opacity:0;}';

    css += '.x-header-title{user-select:none;line-height:42px;font-size:13px;cursor:default;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}';
    css += '.x-header-button{width:42px;height:42px;cursor:pointer;background-size:16px;background-position:center center;background-repeat:no-repeat;flex:1 0 auto;}';
    css += '.x-header-button>span{display:block;width:calc(100% - 10px);height:calc(100% - 10px);margin-top:5px;margin-left:5px;border-radius:50%;}';
    css += '.x-header-button:hover>span{background-color:rgba(255,255,255,0.04);}';
    css += '.x-header-button:active>span{background-color:rgba(255,255,255,0.08);}';
    css += '.x-header-button:focus>span{background-color:rgba(255,255,255,0.08);}';
    css += '.x-header{transition:opacity ' + x.animationTime + 'ms;opacity:1;}';// for the manual loading indicator
    if (!modal) {
        css += '.x-header > :last-child{transition:opacity ' + x.animationTime + 'ms;opacity:0;}'; // hide header button while loading
        css += 'body[x-visible] .x-header > :last-child{opacity:1;}';
        // css += 'body:not([x-reveal]) .x-header > :last-child{opacity:0;}'; // hide header button while loading
        // css += 'body[x-reveal="smooth"] .x-header > :last-child{transition:opacity ' + x.animationTime + 'ms;}';
        //css += 'body[x-reveal="instant"] .x-header > :last-child{opacity:1;}';
    }

    css += '.x-loading{opacity:0;user-select:none;transition:opacity ' + x.animationTime + 'ms;position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;display:flex;align-items:center;justify-content:center;}';
    css += '.x-loading > div{animation:x-rotate 1s infinite linear;width:20px;height:20px;background-position:center;background-size:cover;background-repeat:no-repeat;background-image:url(\'' + x.loadingImage + '\')}';
    css += 'body:not([x-visible]) .x-loading{z-index:5;}'; // prevent clicking the body, must be over the header and the body
    css += 'body[x-message] .x-loading{z-index:1;}'; // prevent clicking the body
    css += 'body:not([x-visible]):not([x-message]) .x-loading[x-visible]{opacity:1;z-index:3;}'; // must be over the body but below the header
    css += 'body[x-message] .x-body{opacity:0;}';

    css += 'body[x-loading] .x-loading{z-index:5;opacity:1;}'; // must be over the header and the body
    css += 'body[x-loading] .x-header{opacity:0;}';
    css += 'body[x-loading] .x-body{opacity:0;}';
    css += 'body[x-loading] .x-message{opacity:0;}';

    css += '.x-message{user-select:none;transition:opacity ' + x.animationTime + 'ms;position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;display:flex;align-items:center;justify-content:center;flex-direction:column;}';
    css += '.x-message > :first-child{' + textStyle + 'color:#fff;text-align:center;padding:42px 30px 0 30px;}';
    css += '.x-message > :last-child:not(:empty){padding-top:20px;}';
    css += 'body[x-message]:not([x-loading]) .x-message{opacity:1;z-index:3;}'; // must be over the body but below the header
    css += 'body[x-message] .x-header-title{opacity:0;}'; // the title may depend on the content

    css += '[x-notification-badge]:before{content:"";display:block;position:absolute;width:8px;height:8px;background-color:#1c8ddd;z-index:10;right:-4px;top:6px;border-radius:50%;}';

    css += '.x-header{position:relative;z-index:4;display:flex;flex-direction:row;justify-content:space-between;height:0;width:100%;box-sizing:border-box;}';
    css += '.x-header>*{display:flex;flex-direction:row;}';//padding:' + smallEdgeSpacing + ';
    css += '.x-header>:first-child{flex:0 1 auto;overflow:hidden;}';
    css += '.x-header>:last-child{flex:0 0 auto;}';

    if (modal) {
        css += 'body{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;overflow:auto;}';
        css += 'body>div:first-child{border-radius:4px;background:#fff;margin:5px;max-width:100%;position:relative;min-height:250px;display:flex;flex-direction:column;}';// 250px - space for a message
        css += '.x-header{height:42px;padding-left:' + contentSpacing + ';color:#000;}';
        css += '.x-header-button:hover{background-color:#eee;}';
        css += '.x-header-button:active{background-color:#ddd;}';
        css += '.x-header-button:focus{background-color:#ddd;}';
        css += '.x-header>:last-child>.x-header-button:first-child{border-top-right-radius:4px;border-bottom-left-radius:4px;}';
        css += '.x-header>:last-child>.x-header-button:not(:first-child){border-bottom-right-radius:4px;border-bottom-left-radius:4px;}';
        css += '.x-body{flex:1 1 auto;display:flex;padding:' + contentSpacing + ';}';
        css += '.x-body > *:not(:first-child){margin-top:' + contentSpacing + ';}'; // spacing between elements
        css += '.x-message > :first-child{color:#000;}';
        css += '.x-body > .x-text:first-child{flex:1 1 auto;display:flex;align-items:center;box-sizing:border-box;}';// message in a modal
    } else {
        css += '.x-header{height:50px;position:fixed;top:0;left:0;background-color:#111;}';
        css += '.x-header-title{line-height:50px;height:50px;}';
        css += '.x-header-button{width:50px;height:50px;background-size:20px;}';
        css += 'body[x-has-scroll] .x-header{box-shadow:0 0 5px 0 #111;}';
        css += '.x-header-title{color:#999;opacity:0;transition:opacity ' + x.animationTime + 'ms;}';
        css += 'body[x-message] .x-header>:last-child{display:none;}';
        css += '.x-header-title[x-always-visible]{opacity:1;transition:none;}';
        css += 'body[x-has-scroll] .x-header-title{opacity:1;}';
        css += '.x-header-title:first-child{padding-left:' + contentSpacing + '}';
        css += '[x-template*="message"] .x-header-title{display:block;}';
        css += '.x-body{overscroll-behavior:contain;margin-top:50px;overflow:auto;height:calc(100vh - 50px);padding:0 ' + smallEdgeSpacing + ' ' + contentSpacing + ' ' + smallEdgeSpacing + ';}';
        css += 'body:not([x-template]) .x-body > *:not(:first-child){margin-top:' + contentSpacing + ';}'; // spacing between elements
        css += '[x-template*="tiny"] .x-body > *{width:100%;max-width:400px;margin-left:auto;margin-right:auto;}';
        css += '[x-template*="big"] .x-body > *{width:100%;max-width:600px;margin-left:auto;margin-right:auto;}';
        css += '[x-template*="columns"] [x-templatec="column1"]{width:100%;}'; // large because of separators (to look the same)
        css += '[x-template*="columns"] [x-templatec="column2"]{width:100%;padding-top:' + largeEdgeSpacing + ';}';
        css += '[x-template*="columns"] [x-templatec*="column"] > div  > *:not(:first-child){margin-top:' + contentSpacing + ';}'; // spacing between elements
        css += '[x-template*="tiny"] .x-body > *:not(:first-child){margin-top:' + contentSpacing + ';}'; // spacing between elements
        css += '[x-template*="big"] .x-body > *:not(:first-child){margin-top:' + contentSpacing + ';}'; // spacing between elements

        css += '[x-template*="message"] .x-body{display:flex;}';
        css += '[x-template*="message"] [x-template="content"]{display:flex;justify-content:flex-end;flex-direction:column;min-height:min-content;height:100%;}';
        css += '[x-template*="message"] [x-template="content"] > *:not(:first-child){margin-top:' + contentSpacing + ';}'; // spacing between elements

        css += '@media only screen and (min-width:800px){'; // large screens
        css += '.x-header-title:first-child{padding-left:calc(' + contentSpacing + ' + ' + largeEdgeSpacing + ')}';
        css += '.x-body{padding:0 ' + largeEdgeSpacing + ' ' + largeEdgeSpacing + ' ' + largeEdgeSpacing + ';}';
        css += '[x-template*="columns"] .x-body{display:flex;flex-direction:row;}';
        css += '[x-template*="columns"] [x-templatec="column1"]{min-height:100%;flex:0 0 auto;border-right:1px solid #222;padding-right:' + contentSpacing + ';}';
        css += '[x-template*="columns"] [x-templatec="column2"]{flex:1 1 auto;padding-top:0;padding-left:' + largeEdgeSpacing + ';}';
        css += '[x-template*="profile"] [x-templatec="column1"]{width:280px;}';
        css += '}';
    }

    css += '.x-block, .x-block-click, .x-block-dark, .x-block-dark-click, .x-block-light, .x-block-light-click{max-width:100%;word-break:break-word;padding:' + edgeContentSpacing + ';border-radius:4px;display:flex;flex-direction:column;box-sizing:border-box;}';
    if (!modal) {
        css += '.x-block, .x-block-click, .x-block-dark, .x-block-dark-click, .x-block-light, .x-block-light-click{border-radius:8px;}';
    }
    css += '.x-block-click{cursor:pointer;}';
    css += '.x-block-click:hover{background-color:rgba(255,255,255,0.04);}';
    css += '.x-block-click:active{background-color:rgba(255,255,255,0.08);}';
    css += '.x-block-click:focus{background-color:rgba(255,255,255,0.08);}';
    css += '.x-block-dark{background-color:rgba(255,255,255,0.04);}';
    css += '.x-block-dark-click{background-color:rgba(255,255,255,0.04);cursor:pointer;}';
    //css += '.x-block-dark-click:hover{background-color:rgba(255,255,255,0.08);}';
    css += '.x-block-dark-click:active{background-color:rgba(255,255,255,0.08);}';
    css += '.x-block-dark-click:focus{background-color:rgba(255,255,255,0.08);}';
    if (modal) {
        css += '.x-block-light-click{cursor:pointer;}';
        css += '.x-block-light-click:hover{background-color:#eee;}';
        css += '.x-block-light-click:active{background-color:#e8e8e8;}';
        css += '.x-block-light-click:focus{background-color:#e8e8e8;}';
    } else {
        css += '.x-block-light, .x-block-light-click{padding:' + contentSpacing + ';}';
        css += '.x-block-light{background-color:#fafafa;}';
        css += '.x-block-light-click{background-color:#fafafa;cursor:pointer;}';
    }

    document.body.insertAdjacentHTML('afterbegin', '<div><div class="x-loading"><div></div></div><div class="x-message"></div><div class="x-header"><div></div><div></div></div><div class="x-body"></div></div>');
    document.body.setAttribute('aria-hidden', 'true');

    var bodyContainer = document.querySelector('.x-body');
    bodyContainer.addEventListener('scroll', () => {
        if (bodyContainer.scrollTop > 0) {
            document.body.setAttribute('x-has-scroll', '1');
        } else {
            document.body.removeAttribute('x-has-scroll');
        }
    });

    var setWidth = width => {
        document.body.firstChild.style.width = width + 'px';
    };

    x.setTemplate = name => {
        document.body.setAttribute('x-template', name);
        if (name.indexOf('columns') !== -1) {
            // the first column needs a container for the border, the second one needs a container for the desktop scrollbars when the content is centered
            bodyContainer.insertAdjacentHTML('afterbegin', '<div x-templatec="column1"><div x-template="column1"></div></div><div x-templatec="column2"><div x-template="column2"></div></div>');
        } else if (name.indexOf('message') !== -1) {
            bodyContainer.insertAdjacentHTML('afterbegin', '<div x-template="content"></div>');
        }
    };

    x.showLoading = () => {
        document.body.setAttribute('x-loading', '1');
    };

    x.hideLoading = () => {
        document.body.removeAttribute('x-loading');
    };

    // UTILITIES



    var scrollBottom = template => {
        // if (template === 'column1') {
        //     //document.querySelector('[x-template="column1"]').scrollIntoView(false);
        // } else {

        // }
        document.querySelector('.x-body').scrollTo(0, 999999999);
        document.querySelector('.x-body').parentNode.scrollTo(0, 999999999);
    };

    x.scrollBottom = template => {
        x.windowEvents.addEventListener('beforeShow', () => {
            scrollBottom(template);
        });
        scrollBottom(template);
    };



    // ERRORS

    x.addErrorHandler = (errorNames, callback) => {
        for (var errorName of errorNames) {
            errorHandlers[errorName] = callback;
        }
    };

    x.showMessage = (text, options = {}) => {
        document.body.setAttribute('x-message', '1');
        var container = document.querySelector('.x-message');
        container.innerHTML = '<div></div><div></div>';
        container.firstChild.innerText = text;
        if (modal && options.buttonText === undefined) {
            options.buttonText = 'OK';
            options.buttonClick = () => { // should be function to prevent passing on the event.
                x.back();
            };
        }
        if (options.buttonText !== undefined) {
            var button = x.makeButton(options.buttonText, options.buttonClick, { style: 'style2' });
            container.lastChild.appendChild(button.element);
        }
    };


    // WINDOWS

    x.open = async (location, args, options) => {
        return new Promise((resolve, reject) => {
            try {
                x.proxyCall('open', location, args, options);
                openActionResolve = resolve;
            } catch (e) {
                reject(e);
            }
        });
    };

    x.preload = async (location, args, options = {}) => {
        return x.proxyCall('preload', location, args, options);
    };

    x.openPreloaded = async windowID => {
        x.proxyCall('openPreloaded', windowID);
    };

    // x.backPrepare = () => {
    //     return x.proxyCall('backPrepare');
    // };

    x.back = async (result, options = {}) => {
        await x.proxyCall('backPrepare');
        if (typeof result === 'undefined') {
            result = null;
        }
        return x.proxyCall('back', result, options);
    };

    x.refresh = () => {
        return x.proxyCall('refresh');
    };

    x.alert = text => {
        return x.proxyCall('alert', text);
    };

    x.confirm = async text => {
        return x.proxyCall('confirm', text);
    };

    x.downloadFile = async (dataURI, name) => {
        return x.proxyCall('downloadFile', dataURI, name);
    };

    // SHARE

    x.share = async (type, value) => {
        x.open('system/share', { type: type, value: value }, { modal: true, width: 300 });
    };

    x.setTitle = (text, alwaysVisible = false) => {
        title = text;
        var container = document.querySelector('.x-header-title');
        if (container === null) {
            container = document.createElement('div');
            container.setAttribute('class', 'x-header-title');
            if (alwaysVisible) {
                container.setAttribute('x-always-visible', '1');
            } else {
                if (!modal) {
                    container.setAttribute('aria-hidden', 'true');
                }
            }
        }
        container.innerText = text;
        document.body.querySelector('.x-header').firstChild.appendChild(container);
        document.title = text;
    };

    x.setHash = _hash => {
        hash = _hash;
    };

    x.addToolbarButton = (title, callback, icon, position = 'right', order = null) => {
        var button = document.createElement('div');
        button.setAttribute('class', 'x-header-button');
        button.setAttribute('tabindex', '0');
        button.setAttribute('role', 'button');
        button.setAttribute('title', title);
        button.setAttribute('aria-label', title);
        if (callback !== null) {
            x.addClickToOpen(button, callback);
        } else {
            button.setAttribute('x-info', '1');
        }
        if (order) {
            button.style.order = order;
        }
        var setIcon = icon => {
            button.style.backgroundImage = 'url(\'' + x.getIconDataURI(icon, '#999') + '\')';
        };
        setIcon(icon);
        button.innerHTML = '<span></span>';
        var container = document.body.querySelector('.x-header')[position === 'left' ? 'firstChild' : 'lastChild'];
        container.appendChild(button);
        return {
            setIcon: setIcon
        };
    };

    x.addToolbarNotificationsButton = (notificationID, serviceDataSource, text) => {
        x.wait(async () => {
            var exists = x.currentUser.exists() ? await x.notifications.exists(notificationID) : false;
            var button = x.addToolbarButton('Notification settings', async () => {
                var action = exists ? 'delete' : 'add';
                var serviceData = await serviceDataSource(action);
                await x.open('system/manageNotification', {
                    action: action,
                    serviceData: serviceData,
                    text, text
                }, { modal: true, width: 300 });
            }, exists ? 'notification-tick' : 'notification', 'right');
            observers.push([async () => {
                exists = await x.notifications.exists(notificationID);
                button.setIcon(exists ? 'notification-tick' : 'notification');
            }, () => {
                return ['notifications/' + notificationID]
            }])
        });
    };

    x.addToolbarSecretButton = text => {
        x.addToolbarButton('About', () => {
            x.open('system/message', { text: text }, { modal: true, width: 300 });
        }, 'lock');
    };

    // TOOLTIPS

    css += '.x-tooltip{position:fixed;z-index:201;top:0;left:0;background-color:rgba(0,0,0,0);width:100%;height:100%;}';// width:100%;height:100%; are problem in modal
    css += '.x-tooltip > div{position:relative;z-index:202;min-width:50px;min-height:20px;box-shadow:0 0 2px 0 rgba(0,0,0,0.5);display:inline-flex;flex-direction:column;background-color:#eee;border-radius:4px;}';
    css += '.x-tooltip a{' + textStyle + 'line-height:42px;width:100%;padding:0 16px;height:42px;box-sizing:border-box;display:inline-block;cursor:pointer;}';
    css += '.x-tooltip a:first-child{border-top-left-radius:2px;border-top-right-radius:2px;}';
    css += '.x-tooltip a:last-child{border-bottom-left-radius:2px;border-bottom-right-radius:2px;}';
    css += '.x-tooltip a:hover{background-color:rgba(0,0,0,0.04);}';
    css += '.x-tooltip a:active{background-color:rgba(0,0,0,0.08);}';


    // LIST

    css += '.x-list{position:relative;width:100%;}';
    css += '.x-list > div{width:100%;box-sizing:border-box;position:relative;}';
    css += '.x-list > div > *{width:100%;}'; // makes all buttons inside 100%, is this the best way?
    //css += 'body[x-type="default"] .x-list[x-type="list"] > div:not(:last-child){margin-bottom:' + contentSpacing + ';}';

    x.makeList = (options = {}) => {
        var type = typeof options.type !== 'undefined' ? options.type : 'list';
        var showSpacing = typeof options.showSpacing !== 'undefined' ? options.showSpacing : false;
        var container = document.createElement('div');
        container.setAttribute('class', 'x-list');
        container.setAttribute('x-type', type);
        var add = (item) => {
            var itemContainer = document.createElement('div');
            itemContainer.appendChild(item.element);
            container.appendChild(itemContainer);
        };
        if (type === 'grid') {
            var spacing = showSpacing ? contentSpacingInt : 0; // edgeSpacingInt
            var gridItemWidth = 500;
            var lastUpdatedContainerWidth = null;
            var updateSize = () => {
                var containerWidth = Math.floor(container.getBoundingClientRect().width);
                if (containerWidth === 0) { // sometimes it happens
                    return;
                }
                if (containerWidth === lastUpdatedContainerWidth) {
                    return;
                }
                var columnsCount = Math.ceil(containerWidth / gridItemWidth);
                var isGrid = columnsCount > 1;
                if (isGrid) {
                    var maxWidth = containerWidth - ((columnsCount - 1) * spacing);
                    var columnsTop = [];
                    var columnsLeft = [];
                    var columnsWidths = [];
                    var columnWidth = Math.round(maxWidth / columnsCount);
                    for (var i = 0; i < columnsCount; i++) {
                        columnsTop[i] = 0;
                        columnsLeft[i] = i * (columnWidth + spacing);
                        columnsWidths[i] = i === columnsCount - 1 ? Math.floor(maxWidth - (columnWidth * (columnsCount - 1))) : columnWidth;
                    }
                }
                var items = container.childNodes;
                var itemsCount = items.length;
                for (var i = 0; i < itemsCount; i++) {
                    var element = items[i];
                    if (isGrid) {
                        var columnIndex = 0;
                        for (var j = 0; j < columnsCount; j++) {
                            if (j !== columnIndex && columnsTop[j] < columnsTop[columnIndex]) {
                                columnIndex = j;
                            }
                        }
                        element.style.position = 'absolute';
                        element.style.top = columnsTop[columnIndex] + 'px';
                        element.style.left = columnsLeft[columnIndex] + 'px';
                        element.style.width = columnsWidths[columnIndex] + 'px';
                        columnsTop[columnIndex] += element.getBoundingClientRect().height + spacing;
                        element.style.paddingTop = '0';
                    } else {
                        element.style.position = 'relative';
                        element.style.top = '0';
                        element.style.left = '0';
                        element.style.width = '100%';
                        element.style.paddingTop = i > 0 ? (spacing + 'px') : '0';
                    }
                };
                lastUpdatedContainerWidth = containerWidth;
                if (isGrid) {
                    container.style.height = Math.ceil(Math.max(...columnsTop) - spacing) + 'px';
                } else {
                    container.style.height = 'auto';
                }
            };
            x.windowEvents.addEventListener('beforeShow', updateSize);
            x.windowEvents.addEventListener('update', updateSize);
            x.windowEvents.addEventListener('resize', updateSize);

            // var addOnResize = (element, callback) => {
            //     var rect = element.getBoundingClientRect();
            //     var previousValue = Math.floor(rect.width) + '/' + Math.floor(rect.height);
            //     var call = 0;
            //     var addObserver = () => {
            //         var observer = new ResizeObserver(entries => {
            //             var rect = entries[0].contentRect;
            //             if (rect.width > 0 && rect.height > 0) { // weird in Firefox
            //                 var currentValue = Math.floor(rect.width) + '/' + Math.floor(rect.height);
            //                 //console.log(currentValue);
            //                 if (previousValue !== currentValue) {
            //                     observer.unobserve(element);
            //                     delete observer;
            //                     previousValue = currentValue;
            //                     call = 1;
            //                 }
            //             }
            //         });
            //         observer.observe(element);
            //     };
            //     addObserver();
            //     var check = () => {
            //         requestAnimationFrame(() => {
            //             if (call === 1) {
            //                 call = 2;
            //             } else if (call === 2) {
            //                 call = 3;
            //                 callback();
            //             } else if (call === 3) {
            //                 call = 0;
            //                 //addObserver();
            //             }
            //             check();
            //         });
            //     };
            //     check();
            // };
            // addOnResize(container, updateSize);
        }
        return {
            add: add,
            element: container
        };
    };

    if (modal) {
        css += '.x-hint{' + textStyle + 'width:100%;color:' + lightThemeHintColor + ';}';
    } else {
        css += '.x-hint{' + textStyle + 'color:' + darkThemeHintColor + ';padding:0 ' + contentSpacing + ';max-width:400px;}';
    }

    x.makeHint = text => {
        var container = document.createElement('div');
        container.setAttribute('class', 'x-hint');
        container.innerText = text;
        return {
            element: container
        }
    };

    if (modal) {
        css += '.x-text{' + textStyle + 'width:100%;}';
    } else {
        css += '.x-text{' + textStyle + 'padding:0 ' + contentSpacing + ';max-width:400px;}';
    }

    x.makeText = (text, center = false) => {
        var container = document.createElement('div');
        container.setAttribute('class', 'x-text');
        container.innerText = text;
        if (center) {
            container.style.textAlign = 'center';
            container.style.justifyContent = 'center';// when a flexitem in modal
        }
        return {
            element: container
        }
    };

    if (modal) {
    } else {
        css += '.x-separator{width:100%;box-sizing:border-box;margin-top:' + contentSpacing + ';margin-bottom:' + contentSpacing + ';padding-left:' + contentSpacing + ';padding-right:' + contentSpacing + ';}';
        css += '.x-separator>div{border-top:1px solid #222;}';
        // css += '@media only screen and (min-width:800px){'; // large screens
        // css += '.x-separator{padding-left:0;padding-right:0;}';
        // css += '}';
    }

    x.makeSeparator = () => {
        var container = document.createElement('div');
        container.setAttribute('class', 'x-separator');
        container.innerHTML = '<div></div>';
        return {
            element: container
        }
    };

    if (modal) {
        css += '.x-title{' + titleStyle + 'box-sizing:border-box;color:#000;padding-top:30px;}';
        css += '.x-title-small{' + smallTitleStyle + 'box-sizing:border-box;color:#000;padding-top:30px;}';
    } else {
        css += '.x-title{' + titleStyle + 'position:relative;box-sizing:border-box;color:#eee;padding:5px ' + contentSpacing + ' 0 ' + contentSpacing + ';}';
        css += '.x-title-small{' + smallTitleStyle + 'position:relative;box-sizing:border-box;color:#eee;padding:30px ' + contentSpacing + ' 0 ' + contentSpacing + ';}';
        // css += '@media only screen and (min-width:800px){';
        // css += '.x-title:first-child{margin-top:-13px;}';
        // css += '}';
        css += '.x-title > div{position:absolute !important;margin-left:8px;margin-top:-8px;}'; // button
        css += '.x-title-small > div{position:absolute !important;margin-left:5px;margin-top:-11px;}'; // button
    }

    var makeTitle = (type, text, options = {}) => {
        var container = document.createElement('div');
        container.setAttribute('class', 'x-title' + type);
        container.innerText = text;
        if (options.buttonOnClick !== undefined) {
            var button = x.makeIconButton(options.buttonOnClick, 'plus');
            container.appendChild(button.element);
        }
        return {
            element: container
        }
    }

    x.makeTitle = (text, options = {}) => {
        return makeTitle('', text, options);
    };

    x.makeSmallTitle = (text, options = {}) => {
        return makeTitle('-small', text, options);
    };

    css += '.x-button{' + textStyle + 'border-radius:4px;user-select:none;box-sizing:border-box;height:42px;line-height:42px;display:block;cursor:pointer;position:relative;}'; // position:relative; because of notification badge;
    //css += ':not(.x-button)+.x-button,.x-button:first-child{border-top-left-radius:2px;border-top-right-radius:2px;}';
    //css += ':not(.x-button)+.x-button,.x-button:last-child{border-bottom-left-radius:2px;border-bottom-right-radius:2px;}';
    css += '.x-button-icon{min-width:42px;background-repeat:no-repeat;background-size:20px;background-position:center;}';
    css += '.x-button-icon:not(:empty){padding-left:38px;}';
    if (modal) {
        css += '.x-button{color:#000;width:100%;text-align:center;}';
        css += '.x-button:hover{background-color:#eee;}';
        css += '.x-button:active{background-color:#e8e8e8;}';
        css += '.x-button:focus{background-color:#e8e8e8;}';
        css += '.x-button:not(:empty){padding:0 16px;}';
    } else {
        css += '.x-button{color:#fff;display:inline-block;border-radius:21px;}';//display:table;margin:0 auto;width:auto;
        css += '.x-button:not(:empty){padding:0 21px;}';
        css += '.x-button:hover{background-color:rgba(255,255,255,0.04)}';//background-color:#2a2a2a;
        css += '.x-button:active{background-color:rgba(255,255,255,0.08)}';
        css += '.x-button:focus{background-color:rgba(255,255,255,0.08)}';
        css += '.x-button[x-style="style1"]{background-color:#24a4f2;}';
        css += '.x-button[x-style="style1"]:hover{background-color:#1c9be8;}';
        css += '.x-button[x-style="style1"]:active{background-color:#188ed6;}';
        css += '.x-button[x-style="style1"]:focus{background-color:#188ed6;}';
        css += '.x-button[x-style="style2"]{border:1px solid #333;}';
        css += '.x-button[x-style="style2"]:hover{background-color:rgba(255,255,255,0.04);}';
        css += '.x-button[x-style="style2"]:active{background-color:rgba(255,255,255,0.08);}';
        css += '.x-button[x-style="style2"]:focus{background-color:rgba(255,255,255,0.08);}';
        css += '.x-button[x-style="style3"]{font-size:13px;height:32px;line-height:30px;border:1px solid #333;border-radius:16px;padding:0 16px;}';
        css += '.x-button[x-style="style3"]:hover{background-color:rgba(255,255,255,0.04);}';
        css += '.x-button[x-style="style3"]:active{background-color:rgba(255,255,255,0.08);}';
        css += '.x-button[x-style="style3"]:focus{background-color:rgba(255,255,255,0.08);}';
    }

    x.makeButton = (text, callback, options = {}) => {
        var icon = options.icon !== undefined ? options.icon : null;
        var styleID = options.style !== undefined ? options.style : null;
        var title = options.title !== undefined ? options.title : null;
        var container = document.createElement('div');
        container.setAttribute('class', 'x-button');
        container.setAttribute('tabindex', '0');
        container.setAttribute('role', 'button');
        if (styleID !== null) {
            container.setAttribute('x-style', styleID);
        }
        x.addClickToOpen(container, callback);
        if (title !== null) {
            container.setAttribute('title', title);
        }
        var setText = text => {
            container.innerText = text;
        };
        setText(text);
        var setIcon = icon => {
            container.setAttribute('class', 'x-button' + (icon !== null ? ' x-button-icon' : ''));
            container.style.backgroundImage = 'url(\'' + x.getIconDataURI(icon, '#fff') + '\')';
        };
        if (icon !== null) {
            setIcon(icon);
        }
        return {
            show: () => {
                container.style.display = 'block';
            },
            hide: () => {
                container.style.display = 'none';
            },
            setText: text => {
                setText(text);
            },
            setIcon: icon => {
                setIcon(icon);
            },
            element: container
        };
    };

    x.makeSubmitButton = (text, callback, options = {}) => {
        var button = x.makeButton(text, callback, options);
        button.element.setAttribute('x-role', 'submit');
        return button;
    };

    var submitForm = () => {
        var button = document.querySelector('[x-role="submit"]');
        if (button !== null) {
            button.click();
        }
    };

    css += '.x-field{width:100%;}';
    css += '.x-field .x-field-label{' + textStyle + 'display:block;padding-bottom:2px;margin-top:-4px;}';

    var makeField = (label, content, className, options = {}) => {
        //var addSpacing = typeof options.addSpacing === 'undefined' ? true : options.addSpacing;
        if (label !== undefined && label !== null && label.length > 0) {
            content = '<label class="x-field-label">' + label + '</label>' + content;
        }
        var container = document.createElement('div');
        container.setAttribute('class', 'x-field ' + className);
        container.innerHTML = content;
        return container;
    };

    css += '.x-field-textbox input{border:1px solid #ccc;background-color:rgba(0,0,0,0.04);border-radius:4px;width:100%;padding:0 13px;height:42px;box-sizing:border-box;' + textStyle + '}';
    css += '.x-field-textbox input[readonly]{background-color:transparent}';

    x.makeFieldTextbox = (label, options = {}) => {
        var container = makeField(label, '<input type="text"></input>', 'x-field-textbox');
        var input = container.querySelector('input');
        if (options.maxLength !== undefined) {
            input.setAttribute('maxlength', options.maxLength);
        }
        if (options.placeholder !== undefined) {
            input.setAttribute('placeholder', options.placeholder);
        }
        if (options.readonly !== undefined && options.readonly) {
            input.setAttribute('readonly', 'readonly');
        }
        if (options.type !== undefined) {
            input.setAttribute('type', options.type);
        }
        input.setAttribute('aria-label', label);
        input.addEventListener('keydown', e => {
            if (e.keyCode === 13) {
                submitForm();
            }
        });
        return {
            show: () => {
                container.style.display = 'block';
            },
            hide: () => {
                container.style.display = 'none';
            },
            focus: () => {
                input.focus();
            },
            getValue: () => {
                return input.value.trim();
            },
            setValue: (value) => {
                input.value = value;
            },
            element: container
        };
    };

    css += '.x-field-image > div{box-shadow:0 0 0 1px rgba(0,0,0,0.18) inset;border-radius:4px;width:100%;max-width:100px;height:100px;box-sizing:border-box;display:block;background-size:cover;background-position:center;cursor:pointer;}';

    x.makeFieldImage = (label, options = {}) => {
        var emptyValue = typeof options.emptyValue !== 'undefined' ? options.emptyValue : null;
        var fieldValue = null;
        var container = makeField(label, '<div tabindex="0" role="button"></div><input type="file" accept="image/*" style="display:none;"></input>', 'x-field-image');
        var buttonElement = container.querySelector('div');
        buttonElement.setAttribute('aria-label', label);
        var fileInput = container.querySelector('input');
        var setValue = async value => {
            fieldValue = value;
            buttonElement.style.backgroundImage = fieldValue === null ? (emptyValue !== null ? 'url(' + await x.image.getURL(emptyValue) + ')' : '') : 'url(' + await x.image.getURL(fieldValue) + ')';
        };
        x.addClickToOpen(buttonElement, e => {
            if (fieldValue === null) {
                fileInput.click();
            } else {
                var tooltip = x.makeTooltip(document.body);
                tooltip.addButton('Select another', () => { fileInput.click(); });
                tooltip.addButton('Remove selected', () => { setValue(null) });
                tooltip.show(e);
            }
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                var file = fileInput.files[0];
                var reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = async () => {
                    var value = await x.image.make(reader.result);
                    setValue(value);
                };
                reader.onerror = e => {
                    // todo
                };
            };
        });
        return {
            focus: () => {

            },
            getValue: () => {
                return fieldValue;
            },
            setValue: (value) => {
                setValue(value);
            },
            element: container
        };
    };

    css += '.x-field-textarea textarea{border:1px solid #ccc;background-color:rgba(0,0,0,0.04);height:42px;border-radius:4px;resize:none;width:100%;padding:8px 13px;box-sizing:border-box;height:114px;' + textStyle + '}';
    css += '.x-field-textarea textarea[readonly]{background-color:transparent}';

    x.makeFieldTextarea = (label, options = {}) => {
        var height = options.height !== undefined ? options.height : null;
        var container = makeField(label, '<textarea></textarea>', 'x-field-textarea', options);
        var textarea = container.querySelector('textarea');
        if (options.maxLength !== undefined) {
            textarea.setAttribute('maxlength', options.maxLength);
        }
        if (options.placeholder !== undefined) {
            textarea.setAttribute('placeholder', options.placeholder);
        }
        if (options.readonly !== undefined && options.readonly) {
            textarea.setAttribute('readonly', 'readonly');
        }
        textarea.setAttribute('aria-label', label);
        if (height !== null) {
            textarea.style.height = height;
        }
        return {
            show: () => {
                container.style.display = 'block';
            },
            hide: () => {
                container.style.display = 'none';
            },
            focus: () => {
                textarea.focus();
            },
            getValue: () => {
                return textarea.value.trim();
            },
            setValue: (value) => {
                textarea.value = value;
            },
            element: container
        };
    };

    css += '.x-field-checkbox{position:relative;display:block;height:42px;padding-left:56px;width:100%;box-sizing:border-box;}';
    css += '.x-field-checkbox input{display:none;}';
    css += '.x-field-checkbox input+span+span{line-height:42px !important;user-select:none;padding-bottom:0 !important;margin-top:0 !important;}';
    css += '.x-field-checkbox input+span{display:block;position:absolute;width:42px;height:42px;box-sizing:border-box;border:1px solid #ccc;background-color:rgba(0,0,0,0.04);background-size:20px;background-repeat:no-repeat;background-position:center center;border-radius:4px;margin-left:-56px;cursor:pointer;user-select:none;}';
    css += '.x-field-checkbox input:checked+span{background-image:url(\'' + x.getIconDataURI('checkbox', '#111') + '\')}';
    css += '.x-field-checkbox input+span:hover{background-color:rgba(0,0,0,0.08);}';
    css += '.x-field-checkbox input+span:active{background-color:rgba(0,0,0,0.12);}';
    css += '.x-field-checkbox input+span:focus{background-color:rgba(0,0,0,0.08);}';

    x.makeFieldCheckbox = (label, options = {}) => {
        var container = makeField(null, '<label><input type="checkbox"></input><span></span><span class="x-field-label">' + label + '</span></label>', 'x-field-checkbox');
        var firstSpanElement = container.querySelector('span');
        var inputElement = container.querySelector('input');
        firstSpanElement.setAttribute('aria-label', label);
        firstSpanElement.setAttribute('tabindex', '0');
        firstSpanElement.setAttribute('role', 'checkbox');
        firstSpanElement.setAttribute('aria-checked', 'false');
        var updateAria = () => {
            firstSpanElement.setAttribute('aria-checked', result.isChecked() ? 'true' : 'false');
        };
        var result = {
            show: () => {
                container.style.display = 'block';
            },
            hide: () => {
                container.style.display = 'none';
            },
            focus: () => {
                firstSpanElement.focus();
            },
            isChecked: () => {
                return inputElement.checked;
            },
            setChecked: checked => {
                inputElement.checked = checked;
                updateAria();
            },
            element: container
        };
        inputElement.addEventListener('change', e => {
            updateAria();
        });
        firstSpanElement.addEventListener('keypress', e => {
            if (e.keyCode === 32) {
                result.setChecked(!result.isChecked());
            }
        });
        return result;
    };

    css += '.x-container{width:100%;display:flex;flex-direction:column;align-items:start;}';//flex-direction:column;display:flex;
    css += '.x-container-spacing > *:not(:first-child){margin-top:' + contentSpacing + ';}';

    x.makeContainer = (addSpacing = false) => {
        var container = document.createElement('div');
        container.setAttribute('class', 'x-container' + (addSpacing ? ' x-container-spacing' : ''));
        var add = field => {
            container.appendChild(field.element);
        };
        return {
            add: add,
            element: container
        };
    };

    css += '.x-component{width:100%;}';

    x.makeComponent = (source, options = {}) => {
        var container = document.createElement('div');
        container.setAttribute('class', 'x-component'); // use x.makeContainer???
        var addElements = sourceResult => {
            if (sourceResult.element !== undefined) {
                container.appendChild(sourceResult.element);
            } else {
                for (var item of sourceResult) {
                    addElements(item);
                }
            }
        }
        var args = options.args !== undefined ? options.args : {};
        var promise = new Promise(async (resolve, reject) => {
            try {
                var result = await source(args);
                addElements(result);
                resolve();
            } catch (e) {
                reject(e);
            }
        });
        var observedKeys = options.observeChanges !== undefined ? options.observeChanges : [];
        var component = {
            update: async args => {
                return new Promise(async (resolve, reject) => {
                    try {
                        if (typeof args === 'undefined') {
                            args = {};
                        }
                        var result = await source(args);
                        container.innerHTML = '';
                        addElements(result);
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                });
            },
            observeChanges: keys => {
                observedKeys = observedKeys.concat(keys);
            },
            element: container,
            promise: promise
        };
        observers.push([component.update, () => { return observedKeys }]);
        return component;
    };

    var addElementInContainer = (element, container) => {
        var add = element => {
            container.appendChild(element);
        };
        if (element instanceof HTMLElement) {
            add(element);
        } else if (typeof element === 'object' && element.element !== undefined) {
            add(element.element);
            if (element.promise !== undefined) {
                x.wait(element.promise);
            }
        } else if (typeof element === 'function') {
            x.wait(new Promise(async (resolve, reject) => {
                try {
                    var result = await Promise.resolve(element())
                    if (result instanceof HTMLElement) {
                        add(result);
                    } else if (typeof result === 'object' && result.element !== undefined) {
                        if (element.promise !== undefined) {
                            var result = await Promise.resolve(element.promise);
                            add(result.element);
                        } else {
                            add(result.element);
                        }
                    }
                    resolve();
                } catch (e) {
                    reject(e);
                }
            }));
        }
    };

    x.add = (element, options = {}) => {
        var template = typeof options.template !== 'undefined' ? options.template : null;
        var container = template === null ? bodyContainer : bodyContainer.querySelector('[x-template="' + template + '"]');
        addElementInContainer(element, container);
    };

    x.wait = promise => {
        if (typeof promise === 'function') {
            promise = Promise.resolve(promise());
        }
        promisesToWait.push(promise);
    };

    x.makeShareButton = async (type, id) => {
        return x.makeButton('Share', () => {
            x.share(type, {
                id: id
            });
        }, { icon: 'share' });
    };


    css += '.x-post[x-content*="s"]{overflow:hidden;}'; // to enable the x-block make it round
    css += '.x-post>.x-post-text{' + textStyle + 'color:#fff;margin-top:-5px;margin-bottom:-5px;word-break:break-word;}';//color:#000;
    css += '.x-post>.x-post-date{' + textStyle + 'color:#666;font-size:13px;padding-top:' + contentSpacing + ';}';
    css += '.x-post[x-content*="u"]>.x-post-text{padding-top:' + contentSpacing + ';}';
    css += '.x-post>.x-post-attachment{overflow:hidden;margin-top:' + contentSpacing + ';}';
    //css += '.x-post:not([x-content*="a"])>.x-post-attachment{border-radius:8px;}';
    css += '.x-post[x-content*="s"]>.x-post-attachment{margin-left:-' + contentSpacing + ';width:calc(100% + 2*' + contentSpacing + ');margin-bottom:-' + contentSpacing + ';}';
    // css += '.x-post[x-content*="u"]>.x-post-attachment{border-top-left-radius:0;border-top-right-radius:0;}';
    // css += '.x-post[x-content*="s"][x-content*="t"]>.x-post-attachment{border-top-left-radius:0;border-top-right-radius:0;}';
    css += '.x-post[x-content*="s"]:not([x-content*="t"]):not([x-content*="u"])>.x-post-attachment{margin-top:-' + contentSpacing + ';}';
    css += '.x-post[x-content*="m"]>.x-post-attachment{border-radius:4px;}';
    css += '.x-post[x-content*="f"]>.x-post-attachment{border-radius:8px;}';

    var makePostElement = async (post, options = {}) => {
        var mode = options.mode !== undefined ? options.mode : 'full'; // summary, attachment
        var showGroup = options.showGroup !== undefined ? options.showGroup : false;
        var showUser = options.showUser !== undefined ? options.showUser : true;
        var theme = options.theme !== undefined ? options.theme : (mode === 'summary' || mode === 'attachment' ? 'light' : 'dark');
        var hasText = post.text !== null && post.text.length > 0;
        var hasAttachments = post.attachments.getCount() > 0;

        var contentElementsSelectors = [];
        var container = document.createElement('div');
        if (mode === 'summary') {
            container.setAttribute('class', 'x-post x-block-light-click');
            contentElementsSelectors.push('s'); // summary mode
            container.setAttribute('tabindex', '0');
            container.setAttribute('role', 'button');
        } else if (mode === 'attachment') {
            container.setAttribute('class', 'x-post');
            contentElementsSelectors.push('m'); // attachment mode
        } else {
            container.setAttribute('class', 'x-post');
            contentElementsSelectors.push('f'); // full mode
            //container.setAttribute('class', 'x-block-dark');
        }

        if (post.groupID !== undefined) {
            var authorPropertyType = 'groupMember';
            var authorPropertyID = post.groupID + '$' + post.userID;
        } else {
            var authorPropertyType = 'user';
            var authorPropertyID = post.userID;
        }

        if (mode === 'full') {
            var userButton = await x.makeProfileButton(authorPropertyType, authorPropertyID, { imageSize: 40 });//, inline: true
            container.appendChild(userButton.element);
            var separator = x.makeSeparator().element;
            separator.style.paddingLeft = edgeContentSpacing;
            separator.style.paddingRight = edgeContentSpacing;
            separator.style.paddingBottom = edgeContentSpacing;
            container.appendChild(separator);
        } else {
            if (showUser) {
                var userHeaderElement = await makeUserHeaderElement(authorPropertyType, authorPropertyID, {
                    text: x.getHumanDate(post.date * 1000),
                    theme: theme,
                    groupID: (showGroup && post.groupID !== undefined ? post.groupID : null)
                });
                container.appendChild(userHeaderElement);
                contentElementsSelectors.push('u');
            }
        }
        if (hasText) {
            contentElementsSelectors.push('t');
            var textElement = document.createElement('div');
            textElement.setAttribute('class', 'x-post-text');
            textElement.style.color = theme === 'light' ? '#000' : '#fff';
            textElement.innerText = post.text;
            if (mode === 'full') {
                textElement.style.paddingTop = 0;
                textElement.style.paddingLeft = edgeContentSpacing;
                textElement.style.paddingRight = edgeContentSpacing;
            }
            container.appendChild(textElement);
        }

        if (hasAttachments) {
            contentElementsSelectors.push('a');
            var attachment = post.attachments.get(post.attachments.getIDs()[0]);
            var attachmentContainer = document.createElement('div');
            attachmentContainer.setAttribute('class', 'x-post-attachment');
            if (mode === 'summary' || mode === 'full') {
                attachmentContainer.style.backgroundColor = theme === 'light' ? '#eee' : 'rgba(255,255,255,0.08)';
            } else {
                attachmentContainer.style.boxShadow = '0 0 0 1px ' + (theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)') + ' inset';
            }
            var attachmentElement = await x.makeAttachmentPreviewElement(attachment, {
                previewOnClick: mode === 'full',
                theme: theme,
            });
            attachmentContainer.appendChild(attachmentElement);
            container.appendChild(attachmentContainer);
        }

        if (mode === 'full') {
            // var separator = x.makeSeparator().element;
            // separator.style.paddingLeft = edgeContentSpacing;
            // separator.style.paddingRight = edgeContentSpacing;
            // container.appendChild(separator);
            var dateElement = document.createElement('div');
            dateElement.setAttribute('class', 'x-post-date');
            dateElement.innerText = x.getHumanDate(post.date, 'Published');
            dateElement.style.paddingLeft = edgeContentSpacing;
            dateElement.style.paddingRight = edgeContentSpacing;
            container.appendChild(dateElement);
        }
        container.setAttribute('x-content', contentElementsSelectors.join(''));
        return container;
    };

    x.makePostsListComponent = (source, options) => {
        options = typeof options === 'undefined' ? {} : x.shallowCopyObject(options);
        options.mode = 'summary';
        var addButton = typeof options.addButton !== 'undefined' ? options.addButton : null;
        var emptyText = typeof options.emptyText !== 'undefined' ? options.emptyText : null;
        var lastSeen = [];
        var component = x.makeComponent(async () => {
            var sourceOptions = {};
            var posts = await source(sourceOptions);
            var container = x.makeContainer(true);
            if (addButton !== null) {
                var addButtonDetails = typeof addButton === 'function' ? await addButton() : addButton;
                if (addButtonDetails !== null) {
                    container.add(x.makeIconButton(addButtonDetails.onClick, 'plus', addButtonDetails.text));//, null, true
                }
            }
            var postsCount = posts.length;
            if (postsCount === 0) {
                if (emptyText !== null) {
                    container.add(x.makeHint(emptyText));
                }
            } else {
                var list = x.makeList({
                    type: 'grid',
                    showSpacing: true
                });
                for (var i = 0; i < postsCount; i++) {
                    var post = posts[i];
                    var element = await makePostElement(post, options);
                    var args = { postID: post.id };
                    if (typeof post.groupID !== 'undefined') {
                        args.groupID = post.groupID;
                    } else if (typeof post.userID !== 'undefined') {
                        args.userID = post.userID;
                    }
                    x.addClickToOpen(element, { location: 'posts/post', args: args, preload: true });
                    list.add({ element: element });
                    lastSeen.push(post.id);
                };
                container.add(list);
            }
            return container;
        });
        component.getLastSeen = () => {
            return lastSeen;
        };
        return component;
    };

    x.makePostPreviewComponent = (postFunction, options) => {
        options = typeof options === 'undefined' ? {} : x.shallowCopyObject(options);
        options.mode = 'full';
        return x.makeComponent(async () => {
            var post = await postFunction();

            var element = await makePostElement(post, options);

            var container = document.createElement('div');
            container.appendChild(element);

            return {
                element: container
            };
        });
    };

    //css += '.x-discussion-container .x-post:not(:last-child){margin-bottom:5px;}';
    css += '.x-discussion-container .x-dpost > *{' + textStyle + 'box-sizing:border-box;cursor:default;color:#fff;padding:7px 12px;border-radius:5px;display:inline-block;line-height:160%;max-width:100%;word-break:break-word;position:relative;}';
    css += '.x-discussion-container .x-dpost > *:hover{background-color:#222222;}';
    css += '.x-discussion-container .x-dpost > [x-notification-badge]{background-color:#222222;}';
    css += '.x-discussion-container .x-user-container{margin-top:-4px;position:relative;min-height:30px;padding-left:' + edgeContentSpacing + ';}';
    css += '.x-discussion-container .x-user-container:not(:first-child){margin-top:' + contentSpacing + ';}';
    css += '.x-discussion-container .x-user-container > :first-child{margin-top:4px;position:absolute;}';
    css += '.x-discussion-container .x-user-container > :last-child{margin-left:40px;}';

    x.makeDiscussionComponent = (source, options = {}) => {
        var groupID = options.groupID !== undefined ? options.groupID : null;

        var serverList = {};
        var clientList = {};

        var loadLimit = 30;
        var load = async page => {
            var listOptions = { keySort: 'desc', limit: (loadLimit + 1), offset: (page - 1) * loadLimit }; // one more is requested for the hasMore variable
            var posts = await source(listOptions);
            var newIDs = [];
            var counter = 0;
            var hasMore = false;
            posts.forEach(post => {
                counter++;
                if (counter <= loadLimit) {
                    if (typeof serverList[post.id] === 'undefined') {
                        newIDs.push(post.id);
                    }
                    serverList[post.id] = post;
                } else {
                    hasMore = true;
                }
            });
            return { loadedCount: posts.length, newIDs: newIDs, hasMore: hasMore };
        };

        var loadedPages = 0;
        var loadedAll = false;
        var loadMore = async () => { // returns true if all loaded
            if (!loadedAll) {
                var result = await load(loadedPages + 1);
                var newIDs = result.newIDs;
                loadedPages++;
                if (!result.hasMore) {
                    loadedAll = true;
                }
                for (var i = 0; i < newIDs.length; i++) {
                    await updatePostUI(newIDs[i]);
                }
                if (loadedAll) {
                    loadMoreContainer.style.display = 'none'; // temp
                }
            }
        };

        var container = document.createElement('div');
        container.setAttribute('class', 'x-discussion-container');

        var loadMoreContainer = document.createElement('div');
        loadMoreContainer.setAttribute('style', 'padding-left:42px;padding-bottom:' + contentSpacing + ';');
        var loadMoreLink = document.createElement('a');
        loadMoreLink.innerText = 'Show more';
        loadMoreLink.setAttribute('style', textStyle + 'cursor:pointer;color:#fff;background:#222;display:inline-block;padding:10px 15px;border-radius:8px;');
        loadMoreLink.setAttribute('tabindex', '0');
        loadMoreLink.setAttribute('role', 'button');
        loadMoreLink.setAttribute('aria-label', 'Show more messages');
        x.addClickToOpen(loadMoreLink, async () => {
            await loadMore();
        });
        loadMoreContainer.appendChild(loadMoreLink);
        container.appendChild(loadMoreContainer);

        var messagesContainer = document.createElement('div');
        container.appendChild(messagesContainer);

        var renderedPosts = {};
        var updatePostUI = async postID => {
            var post = null;
            if (clientList[postID] !== undefined) {
                post = clientList[postID];
            } else if (serverList[postID] !== undefined) {
                post = serverList[postID];
            }

            var isUpdate = renderedPosts[postID] !== undefined;

            if (isUpdate) {
                var postElement = renderedPosts[postID][1];
                var contentElement = postElement.firstChild;
                if (post === null) {
                    var userContentContainer = postElement.parentNode;
                    postElement.parentNode.removeChild(postElement);
                    if (userContentContainer.childNodes.length === 0) {
                        var userContainer = userContentContainer.parentNode;
                        userContainer.parentNode.removeChild(userContainer);
                    }
                    delete renderedPosts[postID];
                    return;
                }
            } else {
                var postElement = document.createElement('div');
                postElement.setAttribute('class', 'x-dpost');
                var contentElement = document.createElement('div');
                postElement.appendChild(contentElement);
            }

            var userID = post.userID;
            var date = post.date;
            var hasText = post.text !== null && post.text.length > 0;
            var hasAttachments = post.attachments.getCount() > 0;
            var tasks = post.data.t !== undefined ? post.data.t : {};

            if (Object.keys(tasks).length > 0) {
                postElement.firstChild.setAttribute('x-notification-badge', '');
            } else {
                postElement.firstChild.removeAttribute('x-notification-badge');
            }
            contentElement.innerText = hasText ? post.text : '';

            if (hasAttachments) {
                // todo improve for updates
                var attachment = post.attachments.get(post.attachments.getIDs()[0]);
                var attachmentContainer = document.createElement('div');
                attachmentContainer.setAttribute('style', 'overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,0.1) inset;border-radius:4px;width:300px;max-width:100%;margin-bottom:5px;' + (hasText ? 'margin-top:7px;' : 'margin-top:5px;'));
                var attachmentElement = await x.makeAttachmentPreviewElement(attachment, { previewOnClick: true, theme: 'dark' });
                attachmentContainer.appendChild(attachmentElement);
                contentElement.appendChild(attachmentContainer);
            }

            if (!isUpdate) {

                var maxDate = 0;
                var previousPostID = null;
                for (var otherPostID in renderedPosts) {
                    var otherPostData = renderedPosts[otherPostID];
                    var otherPostDate = otherPostData[0];
                    if (otherPostDate < date && otherPostDate > maxDate) {
                        maxDate = otherPostDate;
                        previousPostID = otherPostID;
                    }
                }

                var containerToInsertInTo = null;
                var previousElementInTheContainer = null;
                var elementToInsert = null;

                if (previousPostID === null) {
                    var firstChild = messagesContainer.firstChild;
                    if (firstChild === null) { // no other element in the container
                        containerToInsertInTo = messagesContainer;
                        elementToInsert = null; // create user container
                    } else { // there is an element in the container
                        if (firstChild.userID === userID) { // is the same user
                            containerToInsertInTo = firstChild.lastChild; // user content container
                            elementToInsert = postElement;
                        } else { // is other user
                            containerToInsertInTo = messagesContainer;
                            elementToInsert = null; // create user container
                        }
                    }
                } else {
                    var previousPostElement = renderedPosts[previousPostID][1];
                    var previousPostContainer = previousPostElement.parentNode.parentNode;
                    if (previousPostContainer.userID === userID) { // is the same user
                        containerToInsertInTo = previousPostElement.parentNode; // user content container
                        previousElementInTheContainer = previousPostElement;
                        elementToInsert = postElement;
                    } else { // is other user
                        var nextPostContainer = previousPostContainer.nextSibling;
                        if (nextPostContainer !== null) {
                            if (nextPostContainer.userID === userID) {
                                containerToInsertInTo = nextPostContainer.lastChild; // insert first in the user content container
                                elementToInsert = postElement;
                            } else {
                                containerToInsertInTo = messagesContainer;
                                previousElementInTheContainer = previousPostContainer;
                                elementToInsert = null; // create user container
                            }
                        } else {
                            containerToInsertInTo = messagesContainer;
                            previousElementInTheContainer = previousPostContainer;
                            elementToInsert = null; // create user container
                        }
                    }
                }

                if (elementToInsert === null) {
                    var userContainer = document.createElement('div');
                    userContainer.userID = userID;
                    userContainer.setAttribute('class', 'x-user-container');
                    if (groupID !== null) {
                        var profilePropertyType = 'groupMember';
                        var profilePropertyID = groupID + '$' + userID;
                    } else {
                        var profilePropertyType = 'user';
                        var profilePropertyID = userID;
                    }
                    var userImageElement = await getProfileImageElement(profilePropertyType, profilePropertyID, 30);
                    userContainer.appendChild(userImageElement);
                    var userContentContainer = document.createElement('div');
                    userContainer.appendChild(userContentContainer);
                    userContentContainer.appendChild(postElement);
                    elementToInsert = userContainer;
                }

                if (previousPostID === null) {
                    var firstChild = containerToInsertInTo.firstChild;
                    if (firstChild === null) {
                        containerToInsertInTo.appendChild(elementToInsert);
                    } else {
                        containerToInsertInTo.insertBefore(elementToInsert, firstChild);
                    }
                } else {
                    if (previousElementInTheContainer !== null) {
                        if (previousElementInTheContainer.nextSibling) {
                            containerToInsertInTo.insertBefore(elementToInsert, previousElementInTheContainer.nextSibling);
                        } else {
                            containerToInsertInTo.appendChild(elementToInsert);
                        }
                    } else {
                        if (containerToInsertInTo.firstChild !== null) {
                            containerToInsertInTo.insertBefore(elementToInsert, containerToInsertInTo.firstChild);
                        } else {
                            containerToInsertInTo.appendChild(elementToInsert);
                        }
                    }
                }
                renderedPosts[postID] = [date, postElement];
            }
        };

        var component = x.makeComponent(async () => {
            if (loadedPages === 0) {
                await loadMore();
            }
            return {
                element: container
            };
        });
        component.update = async (beforeUpdateCallback = null) => {
            for (var i = 1; i <= loadedPages; i++) {
                var result = await load(i);
                if (beforeUpdateCallback !== null) {
                    await beforeUpdateCallback();
                }
                var newIDsCount = result.newIDs.length;
                for (var i = 0; i < newIDsCount; i++) {
                    await updatePostUI(result.newIDs[i]);
                }
                if (newIDsCount === 0) {
                    break;
                }
            }
        };
        component.deleteMessage = async messageID => {
            delete clientList[messageID];
            await updatePostUI(messageID);
        };
        component.setMessage = async post => {
            clientList[post.id] = post;
            await updatePostUI(post.id);
        };
        component.getLastSeen = () => {
            return Object.keys(renderedPosts);
        };
        return component;
    };

    var getPropertyProfile = async (type, id) => {
        return await x.property.getProfile(type, id);
    };

    var getProfileImageElement = async (type, id, size) => {
        var profile = await getPropertyProfile(type, id);
        var element = document.createElement('div');
        element.setAttribute('style', 'width:' + size + 'px;height:' + size + 'px;border-radius:50%;background-size:cover;background-position:center;background-color:#222;');
        profile.getImage(window.devicePixelRatio * size)//Promise.resolve(profile.getImage(size))
            .then(async image => {
                element.style.backgroundImage = 'url(' + await x.image.getURL(image) + ')';
            });
        return element;
    };

    var makeImageButton = (onClick, imageElement, imageSize, text = null, details = null, hint = null) => {//, inline
        // if (typeof inline === 'undefined') {
        //     inline = false;
        // }

        var container = document.createElement('div');
        container.setAttribute('class', modal ? 'x-block-light-click' : 'x-block-click');
        container.style.display = 'inline-flex';//inline ? 'inline-flex' : 'flex';
        //container.style.flexDirection = 'row';
        container.style.position = 'relative';
        container.setAttribute('tabindex', '0');
        container.setAttribute('role', 'button');

        var hasImage = imageElement !== null;

        if (hasImage) {
            //imageElement.style.flex = '0 0 auto';
            container.appendChild(imageElement);
        }

        var textsContainer = document.createElement('div');
        textsContainer.setAttribute('style', (hasImage ? 'min-height:' + imageSize + 'px;' : '') + 'padding-left:' + (hasImage ? 'calc(' + imageSize + 'px + 15px)' : '5px') + ';padding-right:5px;display:flex;flex-direction:column;justify-content:center;box-sizing:border-box;max-width:100%;');

        if (text !== null) {
            var textElement = document.createElement('div');
            textElement.setAttribute('style', (modal ? darkTextStyle : lightTextStyle) + 'text-overflow:ellipsis;overflow:hidden;white-space:nowrap;max-width:100%;');
            textElement.innerText = text;
            textsContainer.appendChild(textElement);
        }

        if (details !== null) {
            var textElement = document.createElement('div');
            textElement.setAttribute('style', (modal ? darkTextStyle : lightTextStyle) + 'font-size:12px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;max-width:100%;');
            textElement.innerText = details;
            textsContainer.appendChild(textElement);
        }
        if (hint !== null) {
            var textElement = document.createElement('div');
            textElement.setAttribute('style', (modal ? darkTextStyle + 'color:' + lightThemeHintColor + ';' : lightTextStyle + 'color:' + darkThemeHintColor + ';') + 'padding-top:2px;font-size:12px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;max-width:100%;');
            textElement.innerText = hint;
            textsContainer.appendChild(textElement);
        }
        if (textsContainer.childNodes.length > 0) {
            container.appendChild(textsContainer);
            if (hasImage) {
                imageElement.style.position = 'absolute';
            }
        }

        x.addClickToOpen(container, onClick);

        return {
            element: container
        }
    };

    x.makeProfileButton = async (type, id, options = {}) => {
        var onClick = options.onClick !== undefined ? options.onClick : null;
        var hasCustomOnClick = onClick !== null;
        var text = options.text !== undefined ? options.text : null;
        var hasCustomText = text !== null;
        if (onClick === null) {
            if (type === 'user') {
                onClick = { location: 'user/home', args: { userID: id }, preload: true };
            } else if (type === 'group') {
                onClick = { location: 'group/home', args: { id: id }, preload: true };
            } else if (type === 'groupMember') {
                var [groupID, userID] = id.split('$');
                onClick = { location: 'group/member', args: { groupID: groupID, userID: userID }, preload: true };
            } else {
                throw new Error();
            }
        }
        if (!hasCustomText) {
            var profile = await getPropertyProfile(type, id);
            text = profile.name;
        }
        var details = options.details !== undefined ? options.details : null;
        var hint = options.hint !== undefined ? options.hint : null;
        var imageSize = options.imageSize !== undefined ? options.imageSize : 50;
        var imageElement = await getProfileImageElement(type, id, imageSize);
        var button = makeImageButton(onClick, imageElement, imageSize, text, details, hint);//, inline
        if (!hasCustomOnClick && !hasCustomText) {
            var title = 'Visit ' + profile.name + '\'s profile';
            button.element.setAttribute('title', title);
            button.element.setAttribute('aria-label', title);
        }
        return button;
    };

    x.makeIconButton = (onClick, icon, text = null, details = null, hint = null) => {//, inline
        // if (typeof inline === 'undefined') {
        //     inline = false;
        // }
        var imageElement = document.createElement('div');
        imageElement.setAttribute('style', 'border:1px solid #353535;box-sizing:border-box;width:30px;height:30px;border-radius:50%;background-size:18px;background-repeat:no-repeat;background-position:center;');
        if (icon !== null) {
            imageElement.style.backgroundImage = 'url(\'' + x.getIconDataURI(icon, '#fff') + '\')';
        }
        return makeImageButton(onClick, imageElement, 30, text, details, hint);//, inline
    };

    x.makeTextButton = (onClick, text, details = null, hint = null) => {
        // if (typeof inline === 'undefined') {
        //     inline = false;
        // }
        return makeImageButton(onClick, null, null, text, details, hint);
    };

    var makeUserHeaderElement = async (propertyType, propertyID, options = {}) => {
        var profile = await x.property.getProfile(propertyType, propertyID);
        var text = typeof options.text !== 'undefined' ? options.text : '';
        var groupID = typeof options.groupID !== 'undefined' ? options.groupID : null;
        var theme = typeof options.theme !== 'undefined' ? options.theme : 'dark';
        var hasGroup = groupID !== null;

        var headerElement = document.createElement('div');
        headerElement.setAttribute('style', 'display:flex;flex-direction:row;height:30px;');

        var userImageElement = await getProfileImageElement(propertyType, propertyID, 30);
        // if (theme === 'dark') {
        //     userImageElement.style.zIndex = '2';
        //     userImageElement.style.border = '1.5px solid #222';
        //     userImageElement.style.marginLeft = '-1.5px';
        //     userImageElement.style.marginTop = '-1.5px';
        // }
        headerElement.appendChild(userImageElement);

        // if (hasGroup) {
        //     var groupProfile = await x.group.getProfile(groupID);
        //     var groupImageElement = await getProfileImageElement('group', groupID, 12);
        //     groupImageElement.style.marginLeft = '-9px';
        //     groupImageElement.style.marginTop = '-4px';
        //     groupImageElement.style.marginRight = '-2px';
        //     groupImageElement.style.zIndex = '1';
        //     headerElement.appendChild(groupImageElement);
        // }

        var nameElement = document.createElement('div');
        nameElement.setAttribute('style', 'padding-left:10px;line-height:30px;font-size:13px;color:#fff;' + (theme === 'light' ? 'color:#000;' : ''));
        var text = '';
        text = profile.name;
        if (hasGroup) {
            var groupProfile = await x.group.getProfile(groupID);
            text += ' in ' + groupProfile.name;
        }
        nameElement.innerText = text;
        headerElement.appendChild(nameElement);

        return headerElement;
    };



    css += '.x-small-post-form .x-button{color:#fff;font-size:15px;padding-left:13px;padding-right:13px;border-radius:0;border-bottom-left-radius:8px;border-top-right-radius:4px;width:auto;}';
    css += '.x-small-post-form .x-button:hover{background-color:rgba(255,255,255,0.04);}';
    css += '.x-small-post-form .x-button:active{background-color:rgba(255,255,255,0.08);}';
    css += '.x-small-post-form .x-button:focus{background-color:rgba(255,255,255,0.08);}';
    css += '.x-small-post-form .x-field-textarea textarea{border:0;background:transparent;color:#fff;padding-top:12px;}';//shape-outside
    css += '.x-small-post-form .x-add-button{border-radius:0;border-bottom-right-radius:8px;border-top-left-radius:4px;}';
    css += '.x-small-post-form .x-add-button:hover{background-color:rgba(255,255,255,0.04);}';
    css += '.x-small-post-form .x-add-button:active{background-color:rgba(255,255,255,0.08);}';
    css += '.x-small-post-form .x-add-button:focus{background-color:rgba(255,255,255,0.08);}';

    x.makePostForm = async (post, options = {}) => {
        if (typeof post === 'undefined' || post === null) {
            post = x.posts.make();
        }
        var editMode = post.id !== null;

        var profilePropertyType = options.profilePropertyType !== undefined ? options.profilePropertyType : null;
        var profilePropertyID = options.profilePropertyID !== undefined ? options.profilePropertyID : null;
        if (profilePropertyType === null) {
            profilePropertyType = 'user';
        }
        if (profilePropertyID === null) {
            profilePropertyID = x.currentUser.getID();
        }

        var submitText = typeof options.submitText !== 'undefined' ? options.submitText : (editMode ? "Save changes" : "Publish");
        var clearOnSubmit = typeof options.clearOnSubmit !== 'undefined' ? options.clearOnSubmit : false;
        var type = typeof options.type !== 'undefined' ? options.type : 'block';

        if (typeof options.attachment !== 'undefined') {
            post.attachments.add(options.attachment);
        }

        var container = document.createElement('div');
        if (type === 'block') {
            var theme = 'light';
        } else {
            container.setAttribute('class', 'x-small-post-form');
            var theme = 'dark';
        }

        var result = {
            onSubmit: null,
            element: container
        };

        var userID = x.currentUser.getID();

        if (type === 'block') {
            var userHeaderElement = await makeUserHeaderElement(profilePropertyType, profilePropertyID, { theme: type === 'block' ? 'light' : 'dark' });
            container.appendChild(userHeaderElement);
        } else if (type === 'small') {
            container.style.position = 'relative';
            var userImageElement = await getProfileImageElement(profilePropertyType, profilePropertyID, 30);
            userImageElement.style.position = 'absolute';
            userImageElement.style.marginTop = edgeContentSpacing;
            userImageElement.style.marginLeft = edgeContentSpacing;
            container.appendChild(userImageElement);
        }

        var formContainer = document.createElement('div');
        formContainer.setAttribute('style', (type === 'small' ? 'margin-left:50px;background-color:rgba(255,255,255,0.08);border-radius:8px;' : 'padding-top:10px;'));

        var fieldText = x.makeFieldTextarea(null, {
            placeholder: (typeof options.placeholder !== 'undefined' ? options.placeholder : ''),
            maxLength: 2000,
            height: type === 'block' ? '200px' : '86px'
        });
        // if (type === 'small') {
        //     fieldText.element.style.marginLeft = '40px';
        // }
        fieldText.element.addEventListener('keyup', e => {
            if (e.ctrlKey === true && e.keyCode === 13) {
                submitButton.element.click();
            }
        });
        formContainer.appendChild(fieldText.element);
        fieldText.setValue(post.text);

        var attachmentContainer = document.createElement('div');
        attachmentContainer.setAttribute('style', 'display:flex;' + (type === 'small' ? 'float:right;' : 'padding-top:' + contentSpacing + ';'));
        formContainer.appendChild(attachmentContainer);
        var rebuildAttachmentUI = async () => {
            attachmentContainer.innerHTML = '';
            if (post.attachments.getCount() > 0) {
                var firstAttachment = post.attachments.get(post.attachments.getIDs()[0]);
                var attachmentPreviewElement = await x.makeAttachmentPreviewElement(firstAttachment, { theme: theme, size: 42 });
                attachmentPreviewElement.setAttribute('tabindex', '0');
                attachmentPreviewElement.setAttribute('role', 'button');
                attachmentPreviewElement.setAttribute('aria-label', 'Attachment');
                x.addClickToOpen(attachmentPreviewElement, e => {
                    var tooltip = x.makeTooltip(document.body);
                    // tooltip.addButton('Preview', () => {
                    //     x.alert('Not implemented yet!');
                    // });
                    tooltip.addButton('Remove', () => {
                        post.attachments.deleteAll();
                        rebuildAttachmentUI();
                    });
                    tooltip.show(e);
                });
                var attachmentPreviewContainer = document.createElement('div');
                attachmentPreviewContainer.setAttribute('style', (type === 'small' ? 'border-bottom-right-radius:8px;border-top-left-radius:4px;' : 'border-radius:4px;box-shadow:0 0 0 1px rgba(0,0,0,0.1) inset;') + 'cursor:pointer;width:42px;height:42px;overflow:hidden;background-color:rgba(255,255,255,0.04);');
                attachmentPreviewContainer.appendChild(attachmentPreviewElement);
                attachmentContainer.appendChild(attachmentPreviewContainer);
            } else {
                var attachmentButton = document.createElement('div');
                attachmentButton.setAttribute('title', 'Add an attachment');
                attachmentButton.setAttribute('class', 'x-add-button');
                attachmentButton.setAttribute('style', (type === 'small' ? '' : 'border:1px solid #ccc;border-radius:4px;') + 'width:42px;height:42px;box-sizing:border-box;background-repeat:no-repeat;background-size:40% 40%;background-position:center;cursor:pointer;');
                attachmentButton.setAttribute('tabindex', '0');
                attachmentButton.setAttribute('role', 'button');
                attachmentButton.setAttribute('aria-label', 'Add an attachment');
                attachmentButton.style.backgroundImage = 'url(\'' + x.getIconDataURI('plus', type === 'small' ? '#fff' : '#999') + '\')';
                x.addClickToOpen(attachmentButton, e => {
                    var tooltip = x.makeTooltip(document.body);
                    tooltip.addButton('Image', () => {
                        x.pickFile(async file => {
                            var value = await x.image.resize(await x.image.make(file.dataURI), 600, null, 100); // 85
                            var attachment = x.attachment.make();
                            attachment.type = 'i';
                            attachment.value = value;
                            post.attachments.add(attachment);
                            rebuildAttachmentUI();
                        }, ['image/*']);
                    });
                    tooltip.addButton('File', () => {
                        x.pickFile(async file => {
                            var value = x.file.make(file.dataURI, file.name, file.dataURI.lenth);
                            var attachment = x.attachment.make();
                            attachment.type = 'f';
                            attachment.value = value;
                            post.attachments.add(attachment);
                            rebuildAttachmentUI();
                        });
                    });
                    // tooltip.addButton('Contact', () => {
                    //     x.alert('Not implemented yet!');
                    // });
                    tooltip.show(e);
                });
                attachmentContainer.appendChild(attachmentButton);
            }
        };
        rebuildAttachmentUI();

        container.appendChild(formContainer);

        var buttonContainer = document.createElement('div');
        formContainer.appendChild(buttonContainer);
        if (type === 'block') {
            buttonContainer.setAttribute('style', 'padding-top:' + contentSpacing + ';');
        } else {
            buttonContainer.setAttribute('style', 'display:inline-block;');
        }

        var submitButton = x.makeButton(submitText, async () => {
            if (post.date === null) {
                post.date = Date.now();
            }
            if (post.userID === null) {
                post.userID = userID;
            }
            post.text = fieldText.getValue().trim();
            if (post.text.length === 0 && post.attachments.getCount() === 0) {
                fieldText.focus();
                return;
            }
            await result.onSubmit(post);
            if (clearOnSubmit) {
                post = x.posts.make();
                fieldText.setValue('');
                rebuildAttachmentUI();
            }
            return true;
        });
        buttonContainer.appendChild(submitButton.element);

        return result;
    };

    x.pickFile = (callback, mimeTypes) => {
        var fileInput = document.createElement('input');
        fileInput.setAttribute('style', 'position:absolute;top:-1000px;');
        fileInput.setAttribute('type', 'file');
        if (mimeTypes !== undefined) {
            fileInput.setAttribute('accept', mimeTypes.join(','));
        }
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                var file = fileInput.files[0];
                var reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = async () => {
                    fileInput.parentNode.removeChild(fileInput);
                    callback({
                        name: file.name,
                        dataURI: reader.result
                    });
                };
                reader.onerror = e => {
                    // todo
                };
            };
        });
        document.body.appendChild(fileInput);
        fileInput.click();
    };

    var systemPick = (type, callback, options) => {
        x.open('system/pick', { type: type, options: options }, { modal: true, width: 300 })
            .then(async result => {
                if (result !== null && typeof result.id !== 'undefined') {
                    await callback(result.id);
                }
            });
    };

    x.pickContact = (callback, options) => {
        systemPick('user', callback, options);
    };

    x.pickGroup = (callback, options) => {
        systemPick('group', callback, options);
    };

    x.makeAttachmentPreviewElement = async (attachment, options = {}) => {
        var type = attachment.type !== undefined ? attachment.type : null;
        var value = attachment.value !== undefined ? attachment.value : {};
        var previewOnClick = options.previewOnClick !== undefined ? options.previewOnClick : false;
        var theme = options.theme !== undefined ? options.theme : 'dark';
        var size = options.size !== undefined ? options.size : null;
        var isLightTheme = theme === 'light';
        var container = document.createElement('div');
        var aspectRatio = null;
        if (type === 'i') { // image
            var details = await x.image.getDetails(value);
            if (size === null) {
                aspectRatio = details.height / details.width;
            }
        }
        container.setAttribute('style', (aspectRatio === null ? '' : 'width:100%;padding-top:' + (aspectRatio * 100) + '%;position:relative;') + 'user-select:none;');
        container.innerHTML = '<div style="' + (aspectRatio === null ? '' : 'position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;') + '' + textStyle + 'color:#000;font-size:12px;"></div>';//line-height:150%;background:#eee;border:1px dotted #ccc;//border-bottom-left-radius:2px;border-bottom-right-radius:2px;
        var previewCallback = null;
        if (type === 'i') { // image
            var setContent = src => {
                if (size !== null) {
                    container.firstChild.innerHTML = '<div style="width:' + size + 'px;height:' + size + 'px;' + (src !== null ? 'background-image:url(\'' + src + '\');background-size:cover;background-position:center;' : '') + '"></div>';
                } else {
                    container.firstChild.innerHTML = src !== null ? '<img src="' + src + '" style="width:100%;">' : '';
                }
            }
            if (details.value === 'data:r') {
                (async () => {
                    var result = await attachment.getResource();
                    setContent(result);
                })();
            } else {
                setContent(details.value);
            }
        } else if (type === 'f') { // file
            var details = await x.file.getDetails(value);
            if (size !== null) {
                container.firstChild.innerHTML = '<div style="width:' + size + 'px;height:' + size + 'px;background-image:url(\'' + x.getIconDataURI('attachment', isLightTheme ? '#999' : '#ccc') + '\');background-size:calc(' + size + 'px / 2);background-repeat:no-repeat;background-position:center;"></div>';
            } else {
                container.firstChild.innerHTML = '<div style="' + textStyle + (isLightTheme ? '' : 'color:#fff;') + 'background-image:url(\'' + x.getIconDataURI('attachment', isLightTheme ? '#999' : '#ccc') + '\');background-size:15px;background-repeat:no-repeat;background-position:' + contentSpacing + ' center;font-size:13px;padding:10px ' + contentSpacing + ' 10px calc(' + contentSpacing + ' + 25px);"></div>';
                container.firstChild.firstChild.innerText = details.name;// + ' (' + details.size + ')';
            }
            previewCallback = async () => {
                x.showLoading();
                var result = await attachment.getResource();
                x.hideLoading();
                await x.downloadFile(result, details.name);
            };
        } else if (type === 'p') { // post
            var propertyID = value.o;
            var postID = value.p;
            previewCallback = () => {
                var args = { postID: postID };
                //args.groupID = post.groupID;
                args.userID = propertyID;
                x.open('posts/post', args);
                //x.addClickToOpen(element, { location: 'posts/post', args: args, preload: true });
            };
            var posts = await x.property.getPosts('user', propertyID, { ids: [postID], cacheValues: true });
            if (posts[0] !== undefined) {
                var post = posts[0];
                if (size !== null) {
                    if (post.groupID !== undefined) {
                        var authorPropertyType = 'groupMember';
                        var authorPropertyID = post.groupID + '$' + post.userID;
                    } else {
                        var authorPropertyType = 'user';
                        var authorPropertyID = post.userID;
                    }
                    container.style.display = 'flex';
                    container.style.alignItems = 'center';
                    container.style.justifyContent = 'center';
                    container.style.height = size + 'px';
                    container.style.width = size + 'px';
                    var element = await getProfileImageElement(authorPropertyType, authorPropertyID, Math.floor(size / 2));
                } else {
                    container.style.padding = contentSpacing;
                    var element = await makePostElement(post, { mode: 'attachment', theme: theme })
                }
                container.firstChild.appendChild(element);
            }
        } else if (type === 'u') { // user
            previewCallback = () => {
                x.open('user/home', { userID: value.i });
            };
            (async () => {
                var userID = value.i;
                var details = await getPropertyProfile('user', userID);
                var imageElement = await getProfileImageElement('user', userID, 30);
                container.firstChild.appendChild(imageElement);
                var nameElement = document.createElement('div');
                nameElement.setAttribute('style', textStyle + 'padding-left:10px;');
                nameElement.innerText = details.name;
                container.firstChild.appendChild(nameElement);
                container.style.padding = contentSpacing;
                container.style.backgroundColor = 'rgba(0,0,0,0.04)';
                container.style.border = '1px solid #ccc';
                container.firstChild.style.display = 'flex';
                container.firstChild.style.alignItems = 'center';
            })();
        } else {
            container.firstChild.innerText = JSON.stringify(attachment);
        }
        if (previewOnClick && previewCallback !== null) {
            container.style.cursor = 'pointer';
            x.addClickToOpen(container, previewCallback);
        }
        return container;
    };

    x.makeAttachmentPreviewComponent = (attachment, options) => {
        return x.makeComponent(async () => {
            var container = document.createElement('div');
            container.setAttribute('style', 'border-radius:4px;overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,0.1) inset;');
            var attachmentPreviewElement = await x.makeAttachmentPreviewElement(attachment, options);
            container.appendChild(attachmentPreviewElement);
            return {
                element: container
            };
        });
    };

    css += '.x-profile-buttons{padding-top:35px;display:flex;flex-direction:row;}';
    css += '.x-profile-buttons > *:not(:first-child){margin-left:10px;}';

    x.makeProfilePreviewComponent = (type, id, options = {}) => {
        var component = x.makeComponent(async () => {
            var details = await getPropertyProfile(type, id);

            component.observeChanges([type + '/' + id + '/profile']);
            // if (!details.exists) {
            //     throw new Error(type === 'user' ? 'The user cannot be found!' : 'The group cannot be found!');
            // }

            var mode = options.mode !== undefined ? options.mode : 'full';
            var theme = options.theme !== undefined ? options.theme : 'dark';

            var container = document.createElement('div');
            container.setAttribute('style', 'position:relative;display:flex;flex-direction:column;align-items:center;padding-bottom:20px;');

            var imageContainer = document.createElement('div');
            imageContainer.setAttribute('style', 'height:200px;position:relative;');

            var imageElement = await getProfileImageElement(type, id, 200);
            imageElement.style.position = 'relative';
            imageElement.style.zIndex = '2';
            imageContainer.appendChild(imageElement);

            if (type === 'group' && options.groupUserID !== undefined) {

                var isActiveMemberOrPendingMember = false;
                var memberGroupDetails = await x.services.call('groups', 'getDetails', { groupID: id, details: ['status', 'invitedBy'] });
                if (memberGroupDetails !== null) {
                    var status = memberGroupDetails.status;
                    isActiveMemberOrPendingMember = status === 'joined' || status === 'pendingApproval';
                }

                if (isActiveMemberOrPendingMember) {
                    var groupUserID = options.groupUserID;
                    var memberElement = await getProfileImageElement('groupMember', id + '$' + groupUserID, 66);
                    memberElement.style.position = 'relative';
                    memberElement.style.boxSizing = 'border-box';
                    memberElement.style.zIndex = '3';
                    memberElement.style.position = 'relative';
                    memberElement.style.marginLeft = '134px';
                    memberElement.style.marginTop = '-66px';
                    memberElement.style.boxShadow = '0 0 0 4px #111';
                    memberElement.style.cursor = 'pointer';
                    x.addClickToOpen(memberElement, { location: 'group/member', args: { groupID: id, userID: groupUserID }, preload: true });
                    imageContainer.appendChild(memberElement);
                    component.observeChanges(['groupMember/' + id + '$' + groupUserID + '/profile']);
                }
            }

            if (type === 'groupMember') {
                var [groupID, userID] = id.split('$');
                var memberElement = await getProfileImageElement('group', groupID, 66);
                memberElement.style.position = 'relative';
                memberElement.style.boxSizing = 'border-box';
                memberElement.style.zIndex = '3';
                memberElement.style.position = 'relative';
                memberElement.style.marginLeft = '134px';
                memberElement.style.marginTop = '-66px';
                memberElement.style.boxShadow = '0 0 0 4px #111';
                memberElement.style.cursor = 'pointer';
                x.addClickToOpen(memberElement, { location: 'group/home', args: { id: groupID }, preload: true });
                imageContainer.appendChild(memberElement);
                component.observeChanges(['group/' + groupID + '/profile']);
            }

            container.appendChild(imageContainer);

            if (options.showEditButton !== undefined && options.showEditButton) {
                var showEditButton = await Promise.resolve(typeof options.showEditButton === 'function' ? options.showEditButton() : options.showEditButton);
                if (showEditButton) {
                    var editButton = x.makeButton('', async () => {
                        var args = {};
                        if (type === 'user') {
                            args.userID = id;
                        } else if (type === 'group') {
                            args.groupID = id;
                        } else if (type === 'groupMember') {
                            args.groupUserID = id;
                        }
                        x.open('profile/form', args, { modal: true, width: 300 });
                    }, { icon: 'edit', title: type === 'group' ? 'Customize group' : 'Edit profile' });
                    editButton.element.style.width = '42px';
                    editButton.element.style.float = 'right';
                    editButton.element.style.borderRadius = '50%';
                    editButton.element.style.position = 'absolute';
                    editButton.element.style.zIndex = '1';
                    editButton.element.style.right = '-8px';
                    editButton.element.style.top = '0';
                    imageContainer.appendChild(editButton.element);
                }
            }

            var nameContainer = document.createElement('div');
            nameContainer.setAttribute('style', (theme === 'dark' ? lightTextStyle : darkTextStyle) + titleStyle + 'padding-top:15px;max-width:100%;overflow:hidden;text-align:center;text-overflow:ellipsis;');
            nameContainer.innerText = details.name;
            container.appendChild(nameContainer);

            var idText = null;
            if (type === 'user') {
                idText = x.isPrivateID(id) ? 'private profile' : x.getShortID(id);
            } else if (type === 'groupMember') {
                var [groupID, userID] = id.split('$');
                idText = x.isPrivateID(userID) ? 'private profile' : x.getShortID(userID);
            }
            if (idText !== null) {
                var idContainer = document.createElement('div');
                idContainer.setAttribute('style', textStyle + 'font-size:13px;max-width:100%;color:' + (theme === 'dark' ? darkThemeHintColor : lightThemeHintColor) + ';overflow:hidden;text-align:center;text-overflow:ellipsis;');
                idContainer.innerText = idText;
                container.appendChild(idContainer);
            }

            if (mode === 'full') {
                var descriptionText = details.description !== null ? details.description.trim() : '';
                if (type === 'groupMember') {
                    var [groupID, userID] = id.split('$');
                    var memberData = await x.services.call('group', 'getMemberData', { groupID: groupID, userID: userID })
                    if (memberData !== null) {
                        if (memberData.status === 'pendingApproval') {
                            if (descriptionText.length !== 0) {
                                descriptionText += "\n\n";
                            }
                            if (userID === x.currentUser.getID()) {
                                descriptionText += 'Your membership must be approved by an administrator. Although you can edit your profile (image, name, etc.).';
                            } else {
                                if (memberData.dateRequestedJoin !== null) {
                                    descriptionText += 'Requested to join on ' + x.getHumanDate(memberData.dateRequestedJoin);
                                }
                            }
                        } else if (memberData.dateJoined !== null) {
                            if (descriptionText.length !== 0) {
                                descriptionText += "\n\n";
                            }
                            if (memberData.invitedBy === null) {
                                descriptionText += 'Founded this group on ' + x.getHumanDate(memberData.dateJoined);
                            } else {
                                descriptionText += 'Member since ' + x.getHumanDate(memberData.dateJoined);
                            }
                        }
                    }
                }
                if (descriptionText.length > 0) {
                    var descriptionTextContainer = document.createElement('div');
                    descriptionTextContainer.setAttribute('style', textStyle + 'color:#fff;word-break:break-word;text-align:center;font-size:13px;padding-top:10px;line-height:20px;width:100%;padding-left:' + edgeContentSpacing + ';padding-right:' + edgeContentSpacing + ';box-sizing:border-box;max-width:300px;');
                    descriptionTextContainer.innerText = descriptionText;
                    container.appendChild(descriptionTextContainer);
                }


                if (type === 'group') {
                    var dataStorage = await x.group.getSharedDataStorage(id); // todo move in groups
                    var list = await dataStorage.getList({ keyStartWith: 'm/a/', keyEndWith: '/a', limit: 101, sliceProperties: ['key'] });
                    var membersCount = list.length;
                    var text = '';
                    if (membersCount > 100) {
                        text = '100+ members';
                    } else if (membersCount === 1) {
                        text = '1 member';
                    } else {
                        text = membersCount + ' members';
                    }

                    var membersContainer = document.createElement('div');
                    membersContainer.setAttribute('style', 'padding-top:10px;margin-bottom:-15px;')
                    var button = x.makeButton(text, async () => {
                        x.open('group/members', { id: id });
                    });
                    membersContainer.appendChild(button.element);
                    container.appendChild(membersContainer);
                    component.observeChanges(['group/' + id + '/members']);
                }

                var getFollowButton = async () => {
                    var currentUserExists = x.currentUser.exists();
                    var isFollowing = currentUserExists ? await x.services.call('explore', 'isFollowing', { type: type, id: id }) : false;
                    var button = x.makeButton(isFollowing ? 'Following' : 'Follow', async () => {
                        if (currentUserExists) {
                            x.open('explore/followForm', { id: x.getTypedID(type, id) }, { modal: true, width: 300 });
                        } else {
                            x.requireUser({ type: 'follow', id: id }); // todo group maybe
                        }
                    }, { style: 'style2' });
                    component.observeChanges(['explore/following/' + type + '/' + id]);
                    return button;
                };

                var getConnectButtons = async publicUserID => {
                    var result = [];
                    if (x.currentUser.exists()) {

                        var connectKey = options.connectKey !== undefined ? options.connectKey : null;
                        var showNotificationBadge = connectKey !== null;

                        var contact = await x.services.call('contacts', 'get', { userID: publicUserID });
                        var request = await x.services.call('contacts', 'getRequest', { userID: publicUserID });
                        var connected = false;
                        var text = null;
                        var icon = 'contacts-plus';
                        if (contact !== null || request !== null) {
                            if (contact !== null && contact.providedAccessKey !== null && contact.accessKey !== null) {
                                text = 'Connected';
                                connected = true;
                                icon = 'contacts-tick';
                                showNotificationBadge = false;
                            } else if (contact !== null && contact.providedAccessKey !== null) {
                                text = 'Connection request sent';
                                icon = 'contacts-clock';
                            } else if ((contact !== null && contact.accessKey !== null) || request !== null) {
                                text = 'Approve connection request';
                                icon = 'contacts-clock';
                            } else if (contact !== null) {
                                text = 'Added to contacts';
                                icon = 'contacts-tick';
                            }
                        } else {
                            if (x.currentUser.isPublic()) {
                                text = 'Connect';
                            } else {
                                text = 'Add to contacts';
                            }
                        }
                        var button = x.makeButton('', async () => {
                            x.open('contacts/connect', { id: publicUserID, connectKey: connectKey }, { modal: true, width: 300 });
                        }, { style: 'style2', icon: icon });
                        if (showNotificationBadge) {
                            button.element.setAttribute('x-notification-badge', '');
                        }
                        result.push(button);
                        component.observeChanges(['contacts/' + publicUserID, 'contactsRequests/' + publicUserID]);

                        if (x.currentUser.isPublic() && connected) {
                            var button = x.makeButton('', async () => {
                                var contact = await x.services.call('contacts', 'get', { userID: publicUserID });
                                if (contact !== null && contact.providedAccessKey !== null && contact.accessKey !== null) {
                                    x.open('messages/thread', { userID: publicUserID });
                                } else {
                                    x.alert('Not connected yet!');
                                }
                            }, { style: 'style2', icon: 'messages' });
                            result.push(button);
                        }

                    }
                    return result;
                };

                var buttonsContainer = document.createElement('div');
                buttonsContainer.setAttribute('class', 'x-profile-buttons')

                if (type === 'user') {
                    if (id !== x.currentUser.getID() && x.isPublicID(id)) {
                        var button = await getFollowButton();
                        buttonsContainer.appendChild(button.element);

                        var buttons = await getConnectButtons(id);
                        for (var button of buttons) {
                            buttonsContainer.appendChild(button.element);
                        }
                    }
                } else if (type === 'groupMember') {
                    var [groupID, userID] = id.split('$');
                    if (userID === x.currentUser.getID()) {
                        var button = x.makeButton('Leave group', async () => {
                            var result = await x.open('group/membership', { id: groupID }, { modal: true, width: 300 });
                            if (result === 'left') {
                                x.showMessage('You\'ve successfully left the group!');
                            }
                        });
                        buttonsContainer.appendChild(button.element);
                    } else {
                        if (userID !== x.currentUser.getID() && x.isPublicID(userID)) {
                            var button = x.makeButton('Visit', async () => {
                                x.open('user/home', { userID: userID });
                            }, { style: 'style2' });
                            buttonsContainer.appendChild(button.element);

                            var buttons = await getConnectButtons(userID);
                            for (var button of buttons) {
                                buttonsContainer.appendChild(button.element);
                            }
                        }
                    }
                } else if (type === 'group') {
                    component.observeChanges(['group/' + id + '/member/' + x.currentUser.getID()]);
                    var memberGroupDetails = await x.services.call('groups', 'getDetails', { groupID: id, details: ['status', 'invitedBy'] });
                    if (memberGroupDetails !== null) {
                        var status = memberGroupDetails.status;
                        var isJoined = status === 'joined';

                        // FOLLOW BUTTON
                        if (isJoined) {
                            var button = await getFollowButton();
                            buttonsContainer.appendChild(button.element);
                        }

                        if (!isJoined) {
                            // JOIN BUTTONs
                            var text = null;
                            if (status === 'pendingApproval') {
                                text = 'Pending approval';
                            } else if (status === null) {
                                text = 'Join/Leave';
                            }
                            var button = x.makeButton(text, async () => {
                                var result = await x.open('group/membership', { id: id }, { modal: true, width: 300 });
                                if (result === 'left') {
                                    x.showMessage('You\'ve successfully left the group!');
                                }
                            }, { style: status === null ? 'style1' : 'style2' });
                            buttonsContainer.appendChild(button.element);
                        }

                        if (isJoined) {
                            // INVITE BUTTON
                            var button = x.makeButton('', () => {
                                x.open('group/invite', { id: id }, { modal: true, width: 300 });
                            }, { style: 'style2', icon: 'group-plus' });
                            buttonsContainer.appendChild(button.element);
                        }
                    }

                }
                if (buttonsContainer.childNodes.length > 0) {
                    container.appendChild(buttonsContainer);
                }
            }

            return {
                element: container
            }
        });
        return component;
    };

    css += '.x-secret-block{padding:0;}';
    css += '.x-secret-block > :first-child{padding:10px 10px 10px ' + contentSpacing + ';font-size:11px;line-height:20px;user-select:none;color:#999;background-size:16px;background-repeat:no-repeat;background-position:center right 10px;height:20px;}';
    css += '.x-secret-block > .x-button{border-radius:0;padding-left:' + contentSpacing + ';}';
    css += '.x-secret-block > .x-button:last-child{border-bottom-left-radius:8px;border-bottom-right-radius:8px;}';

    x.makeSecretComponent = (title, callback) => {
        var component = x.makeComponent(async () => {
            var container = document.createElement('div');
            container.setAttribute('class', 'x-secret-block x-block-dark');
            var titleElement = document.createElement('div');
            titleElement.style.backgroundImage = 'url(\'' + x.getIconDataURI('lock', '#999') + '\')';
            titleElement.innerText = title;
            container.appendChild(titleElement);
            var secretComponent = {
                add: element => {
                    addElementInContainer(element, container);
                }
            }
            await callback(secretComponent);
            return {
                element: container
            }
        });
        return component;
    };

    x.addCSS(css);

}