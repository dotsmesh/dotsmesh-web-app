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
            var updateFunction = observer[0](); // Returns the update function. This allows changing it.
            promises.push(updateFunction());
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
    var lightTextStyle = 'color:#fafafa;';
    var darkTextStyle = 'color:#000;';
    var titleStyle = 'font-size:19px;line-height:160%;font-family:' + x.fontFamily + ';font-weight:bold;';
    var smallTitleStyle = 'font-size:15px;line-height:160%;font-family:' + x.fontFamily + ';font-weight:bold;';
    var hintStyle = 'font-size:13px;line-height:160%;';
    var lightHintStyle = 'color:#777;';
    var darkHintStyle = 'color:#999;';

    var css = '*,*:before,*:after{margin:0;padding:0;outline:none;-webkit-tap-highlight-color:rgba(0,0,0,0);-webkit-overflow-scrolling:touch;}';
    css += 'html,body{height:100%;overflow:hidden;}';
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
    var smallEdgeSpacing = '10px';
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
    css += '.x-body{transition:opacity ' + (modal ? x.modalsAnimationTime : x.animationTime) + 'ms;opacity:1;position:relative;box-sizing:border-box;z-index:2;}' // align-items: flex-start; prevents stretching children // flex should not be for for every window (display:flex;align-items:flex-start;flex-direction:column;)
    css += 'body:not([x-visible]):not([x-message]) .x-body{opacity:0;}';

    css += '.x-header-title{user-select:none;line-height:42px;font-size:13px;cursor:default;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}';
    css += '.x-header-button{width:42px;height:42px;cursor:pointer;background-size:16px;background-position:center center;background-repeat:no-repeat;flex:1 0 auto;}';
    css += '.x-header-button>span{display:block;width:calc(100% - 10px);height:calc(100% - 10px);margin-top:5px;margin-left:5px;border-radius:8px;}';
    css += '.x-header-button:hover>span{background-color:rgba(255,255,255,0.08);}';
    css += '.x-header-button:active>span{background-color:rgba(255,255,255,0.12);}';
    css += '.x-header-button:focus>span{background-color:rgba(255,255,255,0.12);}';
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
    css += '.x-message > :first-child{' + textStyle + 'color:#fff;text-align:center;padding:42px 30px 0 30px;max-width:400px;}';
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
        css += 'body>div:first-child{border-radius:8px;background:#fff;margin:5px;max-width:100%;position:relative;min-height:250px;display:flex;flex-direction:column;}';// 250px - space for a message
        css += '.x-header{height:42px;padding-left:' + contentSpacing + ';color:#000;}';
        css += '.x-header-button:hover{background-color:#eee;}';
        css += '.x-header-button:active{background-color:#ddd;}';
        css += '.x-header-button:focus{background-color:#ddd;}';
        css += '.x-header>:last-child>.x-header-button:first-child{border-top-right-radius:8px;border-bottom-left-radius:8px;}';
        css += '.x-header>:last-child>.x-header-button:not(:first-child){border-bottom-right-radius:8px;border-bottom-left-radius:8px;}';
        css += '.x-body{flex:1 0 auto;padding:' + contentSpacing + ';padding-top:' + smallEdgeSpacing + ';}'; // display:flex;align-items:flex-start;flex-direction:column; breaks elements margin
        css += '.x-body > *:not(:first-child){margin-top:' + contentSpacing + ';}'; // spacing between elements
        css += '.x-message > :first-child{color:#000;}';
        //css += '[x-template="modal-text"] .x-text:first-child{flex:1 0 auto;display:flex;align-items:center;box-sizing:border-box;}';// message in a modal
    } else {
        css += 'body>div:first-child{height:100%;}';
        css += '.x-header{pointer-events:none;height:50px;position:fixed;top:0;left:0;background-color:transparent;transition:background-color ' + x.animationTime + 'ms,box-shadow ' + x.animationTime + 'ms;width:100%;}'; // the width is to make the body scrollbar visible
        css += '.x-header-title{line-height:50px;height:50px;}';
        css += '.x-header-button{width:50px;height:50px;background-size:20px;pointer-events:all;}';
        css += 'body[x-has-scroll] .x-header{box-shadow:0 0 5px 0 #111;background-color:#222;}';
        css += '.x-header-title{color:#999;opacity:0;transition:opacity ' + x.animationTime + 'ms;}';
        css += 'body[x-message] .x-header>:last-child{display:none;}';
        css += '.x-header-title[x-always-visible]{opacity:1;transition:none;}';
        css += 'body[x-has-scroll] .x-header-title{opacity:1;}';
        css += '.x-header-title:first-child{padding-left:' + contentSpacing + '}';
        //css += '[x-template*="message"] .x-header-title{display:block;}';
        css += '.x-body{overflow:auto;overscroll-behavior:contain;height:100%;padding:0 ' + smallEdgeSpacing + ' 0 ' + smallEdgeSpacing + ';}';

        css += '.x-body > [x-template-part="profile"]{max-width:280px;margin:0 auto;width:100%;padding-bottom:' + contentSpacing + ';box-sizing:border-box;}'; // large because of separators (to look the same)
        css += '.x-body > [x-template-part="profile"]:empty{display:none;}';
        css += '.x-body > [x-template-part="content"]{width:100%;max-width:600px;margin-left:auto;margin-right:auto;padding-top:' + contentSpacing + ';padding-bottom:' + contentSpacing + ';}'; // contentSpacing to match elements spacing inside
        css += 'body[x-template="message"] .x-body > [x-template-part="content"]{padding-bottom:' + smallEdgeSpacing + '}';
        css += '.x-body > div > *:not(:first-child){margin-top:' + contentSpacing + ';}'; // spacing between elements

        css += 'body[x-template*="message"] .x-body{display:flex;align-items:flex-start;flex-direction:column;}';
        css += 'body[x-template*="message"] [x-template-part="content"]{display:flex;justify-content:flex-end;flex-direction:column;flex:1 0 auto;}';
        css += 'body[x-template*="message"] [x-template-part="content"] > *:not(:first-child){margin-top:' + contentSpacing + ';}'; // spacing between elements
        css += 'body[x-template="empty"] [x-template-part="content"]{display:none;}';

        css += '@media only screen and (min-width:1240px){'; // large screens / 600 (content) + 280 (column) + 50 (toolbar)
        css += '.x-body{padding-left:' + largeEdgeSpacing + ';padding-right:' + largeEdgeSpacing + ';}';
        css += 'body:not([x-template="empty"]):not([x-template="column"]) .x-body > [x-template-part="profile"]{height:100%;overflow:auto;position:fixed;top:0;left:calc(50% - 600px);padding-top:' + largeEdgeSpacing + ';padding-bottom:' + largeEdgeSpacing + ';}';
        css += 'body[x-template="message"] .x-body > [x-template-part="content"]{padding-bottom:' + largeEdgeSpacing + '}';
        css += 'body:not([x-template="empty"]):not([x-template="column"]) .x-body > [x-template-part="profile"]:not(:empty)+[x-template-part="content"]{padding-top:calc(' + largeEdgeSpacing + ' + 40px);}'; // 40 is the same as the profile preview container
        css += '}';

        css += '@media only screen and (min-width:900px){'; // 950 (toolbar media query) - 50 (toolbar width)
        css += '.x-header{background-color:transparent !important;box-shadow:none !important;height:70px;padding:10px;}';
        css += '.x-header-title{display:none;}';
        css += '}';
    }

    css += '.x-block{max-width:100%;word-break:break-word;padding:' + contentSpacing + ';border-radius:' + (modal ? '4px' : '8px') + ';display:flex;flex-direction:column;box-sizing:border-box;}';
    css += '.x-block-click{cursor:pointer;}';
    css += '.x-block-dark{background-color:rgba(255,255,255,0.08);}';
    css += '.x-block-dark-click:hover{background-color:rgba(255,255,255,0.08);}';
    css += '.x-block-dark-click:active{background-color:rgba(255,255,255,0.12);}';
    css += '.x-block-dark-click:focus{background-color:rgba(255,255,255,0.12);}';
    css += '.x-block-light-click:hover{background-color:#eee;}';
    css += '.x-block-light-click:active{background-color:#e8e8e8;}';
    css += '.x-block-light-click:focus{background-color:#e8e8e8;}';

    document.body.insertAdjacentHTML('afterbegin', '<div><div class="x-loading"><div></div></div><div class="x-message"></div><div class="x-header"><div></div><div></div></div><div class="x-body"></div></div>');
    document.body.setAttribute('aria-hidden', 'true');

    var bodyContainer = document.querySelector('.x-body');
    bodyContainer.addEventListener('scroll', () => {
        if (bodyContainer.scrollTop > 50) {
            document.body.setAttribute('x-has-scroll', '1');
        } else {
            document.body.removeAttribute('x-has-scroll');
        }
    });

    if (!modal) {
        // the first column needs a container for the border, the second one needs a container for the desktop scrollbars when the content is centered
        bodyContainer.insertAdjacentHTML('afterbegin', '<div x-template-part="profile"></div><div x-template-part="content"></div>');
    }

    var setWidth = width => {
        document.body.firstChild.style.width = width + 'px';
    };

    /**
     * 
     * @param string|null name 
     */
    x.setTemplate = (name) => {
        if (name === null) {
            document.body.removeAttribute('x-template'); // the default template
        } else {
            document.body.setAttribute('x-template', name);
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
        var buttonText = options.buttonText;
        var buttonClick = options.buttonClick;
        if (modal && buttonText === undefined) {
            buttonText = 'OK';
            buttonClick = () => { // must be function to prevent passing on the event.
                x.back();
            };
        }
        if (buttonText !== undefined) {
            var button = x.makeButton(buttonText, buttonClick, { style: 'style2' });
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
        if (result === undefined) {
            result = null;
        }
        return x.proxyCall('back', result, options);
    };

    x.refresh = () => {
        return x.proxyCall('refresh');
    };

    x.alert = (text, options = {}) => {
        return x.proxyCall('alert', text, options);
    };

    x.confirm = async (text, options = {}) => {
        return x.proxyCall('confirm', text, options);
    };

    x.downloadFile = async (dataURI, name) => {
        return x.proxyCall('downloadFile', dataURI, name);
    };

    x.openURL = async url => {
        return x.proxyCall('openURL', url);
    };

    x.previewURL = async (url) => {
        x.open("system/previewURL", { url }, { modal: true, width: 400 });
    };

    // SHARE

    x.share = async (type, value) => {
        x.open('system/share', { type: type, value: value }, { modal: true, width: 400 });
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

    /**
     * 
     * @param string notificationID 
     * @param function serviceDataSource 
     * @param string notEnabledText 
     * @param string enabledText 
     */
    x.addToolbarNotificationsButton = (notificationID, serviceDataSource, notEnabledText, enabledText) => {
        x.wait(async () => {
            var exists = x.currentUser.exists() ? await x.notifications.exists(notificationID) : false;
            var button = x.addToolbarButton('Notification settings', async () => {
                var action = exists ? 'delete' : 'add';
                var serviceData = await serviceDataSource(action);
                x.open('system/manageNotification', {
                    action: action,
                    serviceData: serviceData,
                    text: exists ? enabledText : notEnabledText
                }, { modal: true, width: 300 });
            }, exists ? 'notification-tick' : 'notification', 'right');
            observers.push([
                () => {
                    return async () => {
                        exists = await x.notifications.exists(notificationID);
                        button.setIcon(exists ? 'notification-tick' : 'notification');
                    };
                },
                () => {
                    return ['notifications/' + notificationID]
                }
            ])
        });
    };

    x.addToolbarSecretButton = text => {
        x.addToolbarButton('About', () => {
            x.alert(text, { icon: 'lock' });
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
    css += '.x-list[x-type="blocks"] > div:not(:last-child){margin-bottom:' + contentSpacingInt + 'px;}';
    // css += '.x-list[x-type="blocks"] > div{margin-bottom:' + contentSpacingInt * 2 + 'px;padding-bottom:' + contentSpacingInt * 2 + 'px;}';
    // css += '.x-list[x-type="blocks"] > div:before{width:100px;height:1px;background-color:#444;position:absolute;bottom:0;left:calc(50% - 50px);pointer-events-none;content:"";}';
    //css += 'body[x-type="default"] .x-list[x-type="list"] > div:not(:last-child){margin-bottom:' + contentSpacing + ';}';

    x.makeList = (options = {}) => {
        var type = options.type !== undefined ? options.type : 'list';
        var showSpacing = options.showSpacing !== undefined ? options.showSpacing : false;
        var visible = options.visible !== undefined ? options.visible : true;
        var container = document.createElement('div');
        container.setAttribute('class', 'x-list');
        container.setAttribute('x-type', type);
        var itemsVersion = 0;
        var add = (item, position = 'last') => {
            var itemContainer = document.createElement('div');
            itemContainer.appendChild(item.element);
            if (item.id !== undefined) {
                itemContainer.setAttribute('x-list-item-id', item.id);
            }
            if (position === 'first') {
                if (container.firstChild !== null) {
                    container.insertBefore(itemContainer, container.firstChild);
                } else {
                    container.appendChild(itemContainer);
                }
            } else {
                container.appendChild(itemContainer);
            }
            itemsVersion++;
        };
        var updateLayout = null;
        if (type === 'grid') {
            var spacing = showSpacing ? contentSpacingInt : 0; // edgeSpacingInt
            var gridItemWidth = 500;
            var lastItemsVersion = null
            var lastUpdatedContainerWidth = null;
            var updateSize = () => {
                var containerWidth = Math.floor(container.getBoundingClientRect().width);
                if (containerWidth === 0) { // sometimes it happens
                    return;
                }
                if (containerWidth === lastUpdatedContainerWidth && itemsVersion === lastItemsVersion) {
                    return;
                }
                lastUpdatedContainerWidth = containerWidth;
                lastItemsVersion = itemsVersion;
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
                if (isGrid) {
                    container.style.height = Math.ceil(Math.max(...columnsTop) - spacing) + 'px';
                } else {
                    container.style.height = 'auto';
                }
            };
            x.windowEvents.addEventListener('beforeShow', updateSize);
            x.windowEvents.addEventListener('update', updateSize);
            x.windowEvents.addEventListener('resize', updateSize);
            updateLayout = updateSize;
        }
        var show = () => {
            container.style.display = 'block';
        };
        var hide = () => {
            container.style.display = 'none';
        }
        if (!visible) {
            hide();
        }
        return {
            show: show,
            hide: hide,
            add: (item, position = 'last') => {
                add(item, position);
                if (updateLayout !== null) {
                    updateLayout();
                }
            },
            addMultiple: items => {
                for (var item of items) {
                    add(item);
                }
                if (updateLayout !== null) {
                    updateLayout();
                }
            },
            remove: id => {
                var itemContainer = container.querySelector('[x-list-item-id="' + id + '"]');
                if (itemContainer !== null) {
                    itemsVersion++;
                    itemContainer.parentNode.removeChild(itemContainer);
                    if (updateLayout !== null) {
                        updateLayout();
                    }
                }
            },
            element: container
        };
    };

    if (modal) {
        css += '.x-hint{' + hintStyle + darkHintStyle + 'width:100%;' + lightHintStyle + '}';
    } else {
        css += '.x-hint{' + hintStyle + lightHintStyle + 'padding:0 ' + contentSpacing + ';max-width:400px;}';
    }

    x.makeHint = (text, options = {}) => {
        var visible = options.visible !== undefined ? options.visible : true;
        var align = options.align !== undefined ? options.align : null;
        var container = document.createElement('div');
        container.setAttribute('class', 'x-hint');
        if (align !== null) {
            if (align === 'center') {
                container.style.textAlign = 'center';
                container.style.marginLeft = 'auto';
                container.style.marginRight = 'auto';
            }
        }
        container.innerText = text;
        var show = () => {
            container.style.display = 'block';
        };
        var hide = () => {
            container.style.display = 'none';
        }
        if (!visible) {
            hide();
        }
        return {
            show: show,
            hide: hide,
            element: container
        }
    };

    if (modal) {
        css += '.x-text{' + textStyle + 'max-width:100%;box-sizing:border-box;}';
    } else {
        css += '.x-text{' + textStyle + lightTextStyle + 'padding:0 ' + contentSpacing + ';max-width:400px;box-sizing:border-box;}';
    }
    css += '.x-text a{' + textStyle + 'cursor:pointer;text-decoration:underline;}';

    x.makeText = (text, options = {}) => {
        var align = options.align !== undefined ? options.align : null;
        var isHTML = options.isHTML !== undefined ? options.isHTML : true;
        var marginTop = options.marginTop !== undefined ? options.marginTop : null;
        var container = document.createElement('div');
        container.setAttribute('class', 'x-text');
        if (isHTML) {
            container.innerHTML = x.stringReplaceAll(text, "\n", '<br>');
        } else {
            container.innerText = text;
            if (container.innerHTML.indexOf("\n") !== -1) {
                container.innerHTML = x.stringReplaceAll(container.innerHTML, "\n", '<br>');
            }
        }
        if (align === 'center') {
            container.style.textAlign = 'center';
            container.style.justifyContent = 'center'; // when a flexitem in modal
            if (modal) {
                container.style.paddingLeft = contentSpacing; // make it look better
                container.style.paddingRight = contentSpacing; // make it look better
            }
        }
        if (marginTop === 'modalFirst') {
            container.style.marginTop = '15px';
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

    css += '.x-button{' + textStyle + 'border-radius:4px;user-select:none;box-sizing:border-box;height:48px;line-height:48px;display:block;cursor:pointer;position:relative;}'; // position:relative; because of notification badge;
    css += '.x-button-icon{min-width:48px;background-repeat:no-repeat;background-size:20px;background-position:center;}';
    css += '.x-button[disabled]{cursor:default;}';
    if (modal) {
        css += '.x-button{background-color:#24a4f2;color:#fff;width:100%;text-align:center;}';
        css += '.x-button:not([disabled]):hover{background-color:#1c9be8;}';
        css += '.x-button:not([disabled]):active{background-color:#188ed6;}';
        css += '.x-button:not([disabled]):focus{background-color:#188ed6;}';
        css += '.x-button:not(:empty){padding:0 16px;}';
        css += '.x-button+.x-button{margin-top:10px;}';
    } else {
        css += '.x-button{color:#fff;display:inline-block;border-radius:8px;}';//display:table;margin:0 auto;width:auto;
        css += '.x-button:not(:empty){padding:0 19px;}';
        css += '.x-button-icon:not(:empty){padding-left:48px;background-position:14px center;}';
        css += '.x-button:not([disabled]):hover{background-color:rgba(255,255,255,0.08)}';//background-color:#2a2a2a;
        css += '.x-button:not([disabled]):active{background-color:rgba(255,255,255,0.12)}';
        css += '.x-button:not([disabled]):focus{background-color:rgba(255,255,255,0.12)}';
        css += '.x-button[x-style="style1"]{background-color:#24a4f2;}';
        css += '.x-button[x-style="style1"]:not([disabled]):hover{background-color:#1c9be8;}';
        css += '.x-button[x-style="style1"]:not([disabled]):active{background-color:#188ed6;}';
        css += '.x-button[x-style="style1"]:not([disabled]):focus{background-color:#188ed6;}';
        css += '.x-button[x-style="style2"]{border:1px solid rgba(255,255,255,0.08);}';
        css += '.x-button[x-style="style2"]:not([disabled]):hover{border:1px solid transparent;background-color:rgba(255,255,255,0.08);}';//background-color:rgba(255,255,255,0.04);
        css += '.x-button[x-style="style2"]:not([disabled]):active{border:1px solid transparent;background-color:rgba(255,255,255,0.12);}';
        css += '.x-button[x-style="style2"]:not([disabled]):focus{border:1px solid transparent;background-color:rgba(255,255,255,0.12);}';
        css += '.x-button[x-style="style3"]{background-color:rgba(255,255,255,0.08);}';
        css += '.x-button[x-style="style3"]:not([disabled]):hover{background-color:rgba(255,255,255,0.08);}';
        css += '.x-button[x-style="style3"]:not([disabled]):active{background-color:rgba(255,255,255,0.12);}';
        css += '.x-button[x-style="style3"]:not([disabled]):focus{background-color:rgba(255,255,255,0.12);}';
        css += '.x-button[x-style="style4"]{font-size:13px;height:32px;line-height:32px;padding:0 10px;' + lightHintStyle + '}';
        css += '.x-button[x-style="style4"]:not([disabled]):hover{background-color:rgba(255,255,255,0.08);}';
        css += '.x-button[x-style="style4"]:not([disabled]):active{background-color:rgba(255,255,255,0.12);}';
        css += '.x-button[x-style="style4"]:not([disabled]):focus{background-color:rgba(255,255,255,0.12);}';
        css += '.x-button[x-style="style5"]:not([disabled]):hover{background-color:rgba(255,255,255,0.08);}';
        css += '.x-button[x-style="style5"]:not([disabled]):active{background-color:rgba(255,255,255,0.12);}';
        css += '.x-button[x-style="style5"]:not([disabled]):focus{background-color:rgba(255,255,255,0.12);}';
    }

    x.makeButton = (text, callback, options = {}) => {
        var icon = options.icon !== undefined ? options.icon : null;
        var iconColor = options.iconColor !== undefined ? options.iconColor : '#fff';
        var styleID = options.style !== undefined ? options.style : null;
        var title = options.title !== undefined ? options.title : null;
        var align = options.align !== undefined ? options.align : null;
        var textAlign = options.textAlign !== undefined ? options.textAlign : null;
        var visible = options.visible !== undefined ? options.visible : true;
        var marginTop = options.marginTop !== undefined ? options.marginTop : null;
        var container = document.createElement('div');
        container.setAttribute('class', 'x-button');
        container.setAttribute('tabindex', '0');
        container.setAttribute('role', 'button');
        if (styleID !== null) {
            container.setAttribute('x-style', styleID);
        }
        if (align === 'center') {
            container.style.marginLeft = 'auto';
            container.style.marginRight = 'auto';
        }
        if (textAlign === 'center') {
            container.style.textAlign = 'center';
        }
        if (marginTop === 'big') {
            container.style.marginTop = '45px';
        }
        var disabled = false;
        x.addClickToOpen(container, () => {
            if (!disabled) {
                x.executeClickToOpen(callback);
            }
        });
        if (title !== null) {
            container.setAttribute('title', title);
        }
        var setText = text => {
            container.innerText = text;
        };
        setText(text);
        var setIcon = icon => {
            container.setAttribute('class', 'x-button' + (icon !== null ? ' x-button-icon' : ''));
            container.style.backgroundImage = 'url(\'' + x.getIconDataURI(icon, iconColor) + '\')';
        };
        if (icon !== null) {
            setIcon(icon);
        }
        var show = () => {
            container.style.display = 'block';
        };
        var hide = () => {
            container.style.display = 'none';
        }
        if (!visible) {
            hide();
        }
        return {
            show: show,
            hide: hide,
            disable: () => {
                disabled = true;
                container.setAttribute('disabled', 'true');
            },
            enable: () => {
                disabled = false;
                container.removeAttribute('disabled');
            },
            setText: text => {
                setText(text);
            },
            setIcon: icon => {
                setIcon(icon);
            },
            remove: () => {
                container.parentNode.removeChild(container);
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

    css += '.x-field-textbox input{border:1px solid #ccc;background-color:rgba(0,0,0,0.04);border-radius:4px;width:100%;padding:0 13px;height:48px;box-sizing:border-box;' + textStyle + '}';
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
        if (options.align === 'center') {
            input.style.textAlign = 'center';
        }
        if (options.uppercase !== undefined && options.uppercase) {
            input.style.textTransform = 'uppercase';
        }
        if (label !== null) {
            input.setAttribute('aria-label', label);
        } else if (options.placeholder !== undefined) {
            input.setAttribute('aria-label', options.placeholder);
        }
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
            setValue: value => {
                input.value = value;
            },
            element: container
        };
    };

    css += '.x-field-image > div{box-shadow:0 0 0 1px rgba(0,0,0,0.18) inset;border-radius:4px;width:100%;max-width:100px;height:100px;box-sizing:border-box;display:block;background-size:cover;background-position:center;cursor:pointer;}';

    x.makeFieldImage = (label, options = {}) => {
        var emptyValue = options.emptyValue !== undefined ? options.emptyValue : null;
        var fieldValue = null;
        var container = makeField(label, '<div tabindex="0" role="button"></div>', 'x-field-image');
        var buttonElement = container.querySelector('div');
        buttonElement.setAttribute('aria-label', label);
        var setValue = async value => {
            fieldValue = value;
            buttonElement.style.backgroundImage = fieldValue === null ? (emptyValue !== null ? 'url(' + await x.image.getURL(emptyValue) + ')' : '') : 'url(' + await x.image.getURL(fieldValue) + ')';
        };
        var openPicker = () => {
            x.pickFile(async file => {
                var value = await x.image.make(file.dataURI);
                setValue(value);
            }, ['image/*']);
        }
        x.addClickToOpen(buttonElement, e => {
            if (fieldValue === null) {
                openPicker();
            } else {
                var tooltip = x.makeTooltip(document.body);
                tooltip.addButton('Select another', () => { openPicker(); });
                tooltip.addButton('Remove selected', () => { setValue(null) });
                tooltip.show(e.target);
            }
        });
        return {
            focus: () => {

            },
            getValue: () => {
                return fieldValue;
            },
            setValue: value => {
                setValue(value);
            },
            element: container
        };
    };

    css += '.x-field-textarea textarea{border:1px solid #ccc;background-color:rgba(0,0,0,0.04);border-radius:4px;resize:none;width:100%;padding:8px 13px;box-sizing:border-box;height:114px;' + textStyle + '}';
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
        if (options.breakWords !== undefined && options.breakWords) {
            textarea.style.wordBreak = 'break-all';
        }
        if (label !== null) {
            textarea.setAttribute('aria-label', label);
        }
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
            setValue: value => {
                textarea.value = value;
            },
            element: container
        };
    };

    css += '.x-field-rich-textarea > :nth-child(2){border-bottom-left-radius:4px;border-bottom-right-radius:4px;width:100%;box-sizing:border-box;height:48px;display:flex;flex-direction:row;}';
    css += '.x-field-rich-textarea-light > :nth-child(2){border:1px solid #ccc;background-color:rgba(0,0,0,0.04);border-top:0;}';
    css += '.x-field-rich-textarea > :nth-child(2)>div{width:48px;height:47px;cursor:pointer;background-size:16px;background-repeat:no-repeat;background-position:center;}';
    css += '.x-field-rich-textarea > :nth-child(2)>div:hover{background-color:rgba(0,0,0,0.04);}';
    css += '.x-field-rich-textarea > :nth-child(2)>div:active{background-color:rgba(0,0,0,0.08);}';
    css += '.x-field-rich-textarea > :nth-child(1){border-top-left-radius:4px;border-top-right-radius:4px;width:100%;padding:8px 13px;box-sizing:border-box;height:114px;overflow:auto;}';
    css += '.x-field-rich-textarea-light > :nth-child(1){border:1px solid #ccc;background-color:rgba(0,0,0,0.04);' + textStyle + darkTextStyle + '}';
    css += '.x-field-rich-textarea-dark > :nth-child(1){' + textStyle + lightTextStyle + '}';
    css += '.x-field-rich-textarea-light > :nth-child(1) *{' + textStyle + darkTextStyle + '}';
    css += '.x-field-rich-textarea-dark > :nth-child(1) *{' + textStyle + lightTextStyle + '}';
    css += '.x-field-rich-textarea > :nth-child(1) ul{list-style-position:inside;margin:0;padding:0;}';
    css += '.x-field-rich-textarea > :nth-child(1) ol{list-style-position:inside;margin:0;padding:0;}';
    css += '.x-field-rich-textarea > :nth-child(1) a{text-decoration:underline;color:#24a4f2;}';
    css += '.x-field-rich-textarea > :nth-child(1) a *{color:#24a4f2;}';

    x.makeFieldRichTextarea = (label, options = {}) => {
        var height = options.height !== undefined ? options.height : null;
        var theme = options.theme !== undefined ? options.theme : 'link';
        var container = makeField(label, '<div></div><div></div>', 'x-field-rich-textarea x-field-rich-textarea-' + theme, options);
        var buttonsElement = container.childNodes[1];
        var contentElement = container.childNodes[0];

        var getSelectedElement = () => {
            if (contentElement.contains(document.activeElement)) {
                var selection = document.getSelection();
                if (selection.rangeCount > 0) {
                    var selectionRange = selection.getRangeAt(0);
                    if (selectionRange !== null) {
                        var container = selectionRange["startContainer"];
                        var element = container.nodeType === 3 ? container.parentNode : container;
                        if (contentElement.contains(element)) {
                            return element;
                        }
                    }
                }
            }
            return null;
        }
        var selectionRange = null;
        var saveSelection = () => {
            var selection = document.getSelection();
            if (selection.rangeCount > 0) {
                selectionRange = selection.getRangeAt(0);
                return true;
            }
            return false;
        };
        var loadSelection = () => {
            if (selectionRange !== null) {
                //contentElement.focus();
                var selection = document.getSelection();
                if (selection.removeRange !== undefined) { // Not supported in Safari
                    if (selection.rangeCount > 0) {
                        for (var i = 0; i < selection.rangeCount; i++) {
                            selection.removeRange(selection.getRangeAt(i));
                        }
                    }
                }
                selection.addRange(selectionRange);
            }
        };

        var getLinkElement = (childOrLinkElement, container) => {
            var element = childOrLinkElement;
            for (var i = 0; i < 1000; i++) {
                if (element.tagName.toLowerCase() === 'a') {
                    return element;
                }
                element = element.parentNode;
                if (element === container) {
                    break;
                }
            }
            return null;
        };

        var lastSelectedLink = null;
        var updateLink = (linkElement, url = '', title = '') => {
            if (url.length === 0) {
                if (linkElement !== null) {
                    linkElement.outerHTML = linkElement.innerHTML;
                }
            } else {
                if (linkElement === null) {
                    var oldLinks = contentElement.querySelectorAll('a');
                    document.execCommand('createLink', false, url);
                    var newLinks = contentElement.querySelectorAll('a');
                    for (var newLink of newLinks) {
                        var found = false;
                        for (var oldLink of oldLinks) {
                            if (oldLink === newLink) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            newLink.setAttribute('title', title);
                            break;
                        }
                    }
                } else {
                    linkElement.setAttribute('href', url);
                    linkElement.setAttribute('title', title);
                }
            }
        };
        var openLinkWindow = async selectedElement => {
            lastSelectedLink = null;
            if (selectedElement !== null) {
                if (contentElement !== selectedElement) {
                    lastSelectedLink = getLinkElement(selectedElement, contentElement);
                }
                if (saveSelection()) {
                    var result = await x.open('system/richTextareaURL', {
                        url: lastSelectedLink !== null ? lastSelectedLink.getAttribute('href') : '',
                        title: lastSelectedLink !== null ? lastSelectedLink.getAttribute('title') : '',
                    }, { modal: true, width: 300 });
                    loadSelection();
                    if (result !== null) {
                        updateLink(lastSelectedLink, result.url, result.title);
                    }
                }
            }
        };

        var buttons = [
            {
                t: 'Bold', i: 'rich-editor-bold', c: () => {
                    document.execCommand('bold');
                }
            },
            {
                t: 'Italic', i: 'rich-editor-italic', c: () => {
                    document.execCommand('italic');
                }
            },
            {
                t: 'Strikethrough', i: 'rich-editor-strikethrough', c: () => {
                    document.execCommand('strikethrough');
                }
            },
            {
                t: 'Ordered list', i: 'rich-editor-orderedlist', c: () => {
                    document.execCommand('insertOrderedList');
                }
            },
            {
                t: 'Unordered list', i: 'rich-editor-unorderedlist', c: () => {
                    document.execCommand('insertUnorderedList');
                }
            },
            {
                t: 'Link', i: 'rich-editor-link', c: () => {
                    openLinkWindow(getSelectedElement());
                }
            }
        ];

        var linkTooltip = null;
        var lastSelectedLinkElement = null;
        var checkAndHideTimeout = null;
        var updateLinkTooltip = () => {
            var hide = () => {
                if (linkTooltip !== null) {
                    linkTooltip.hide();
                }
            };
            var checkAndHide = () => {
                if (linkTooltip !== null) {
                    if (linkTooltip.element.contains(document.activeElement)) {
                        clearTimeout(checkAndHideTimeout);
                    } else {
                        checkAndHideTimeout = setTimeout(hide, 50); // Todo improve
                    }
                }
            };
            var selectedElement = getSelectedElement();
            if (selectedElement !== null && contentElement !== selectedElement) {
                lastSelectedLinkElement = getLinkElement(selectedElement, contentElement);
                if (lastSelectedLinkElement !== null) {
                    clearTimeout(checkAndHideTimeout);
                    if (linkTooltip === null) {
                        linkTooltip = x.makeTooltip(document.body, { floating: true, destroyOnHide: false });
                        linkTooltip.addButton('Modify link', () => { openLinkWindow(lastSelectedLinkElement); });
                        linkTooltip.addButton('Remove', () => { updateLink(lastSelectedLinkElement) });
                        document.addEventListener('focusin', checkAndHide, true);
                        document.addEventListener('blur', checkAndHide, true);
                    }
                    linkTooltip.show(lastSelectedLinkElement);
                } else {
                    hide();
                }
            } else {
                hide();
            }
        };

        for (var button of buttons) {
            var buttonElement = document.createElement('div');
            buttonElement.style.backgroundImage = 'url(' + x.getIconDataURI(button.i, theme === 'light' ? '#333' : '#777') + ')';
            buttonElement.addEventListener('mousedown', e => {
                e.preventDefault()
                e.stopPropagation();
            });
            buttonElement.setAttribute('title', button.t);
            buttonElement.addEventListener('click', button.c);
            buttonsElement.appendChild(buttonElement);
        }
        if (label !== null) {
            contentElement.setAttribute('aria-label', label);
        }
        contentElement.setAttribute('tabindex', '0');
        contentElement.setAttribute('contenteditable', 'true');
        if (height !== null) {
            contentElement.style.height = height;
        }
        contentElement.addEventListener("keyup", updateLinkTooltip);
        contentElement.addEventListener("mouseup", updateLinkTooltip);
        contentElement.addEventListener("dragend", updateLinkTooltip);
        return {
            show: () => {
                container.style.display = 'block';
            },
            hide: () => {
                container.style.display = 'none';
            },
            focus: () => {
                contentElement.focus();
            },
            getValue: () => {
                return x.convertHTML(contentElement.innerHTML);
            },
            setValue: (value, type = 'text') => {
                if (type === 'richText') {
                    var html = x.convertRichText(value, 'html');
                } else if (type === 'text') {
                    var html = x.convertText(value, 'html');
                } else {
                    throw new Error();
                }
                contentElement.innerHTML = html;
            },
            element: container
        };
    };

    css += '.x-field-checkbox{position:relative;display:block;height:48px;padding-left:56px;width:100%;box-sizing:border-box;}';
    css += '.x-field-checkbox input{display:none;}';
    css += '.x-field-checkbox input+span+span{line-height:48px !important;user-select:none;padding-bottom:0 !important;margin-top:0 !important;}';
    css += '.x-field-checkbox input+span{display:block;position:absolute;width:48px;height:48px;box-sizing:border-box;border:1px solid #ccc;background-color:rgba(0,0,0,0.04);background-size:20px;background-repeat:no-repeat;background-position:center center;border-radius:4px;margin-left:-56px;cursor:pointer;user-select:none;}';
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

    css += '.x-container{width:100%;}';// display:flex;flex-direction:column;align-items:start; breaks elements margin
    css += '.x-container-spacing > *:not(:last-child){margin-bottom:' + contentSpacing + ';}';

    x.makeContainer = (options = {}) => {
        var addSpacing = options.addSpacing !== undefined ? options.addSpacing : false;
        var align = options.align !== undefined ? options.align : null;
        var container = document.createElement('div');
        container.setAttribute('class', 'x-container' + (addSpacing ? ' x-container-spacing' : ''));
        if (align !== null) {
            container.style.setProperty('align-items', align);
        }
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
            if (sourceResult === null) {
                return;
            }
            if (sourceResult.element !== undefined) {
                container.appendChild(sourceResult.element);
            } else {
                for (var item of sourceResult) {
                    addElements(item);
                }
            }
        }
        var component = {
        };
        var promise = new Promise(async (resolve, reject) => {
            try {
                var result = await source(component);
                addElements(result);
                resolve();
            } catch (e) {
                reject(e);
            }
        });
        var observedKeys = options.observeChanges !== undefined ? options.observeChanges : [];
        component.update = async () => {
            var result = await source(component);
            container.innerHTML = '';
            addElements(result);
        };
        component.observeChanges = keys => {
            observedKeys = observedKeys.concat(keys);
        };
        component.element = container;
        component.promise = promise;
        observers.push([() => { return component.update }, () => { return observedKeys }]);
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
        if (modal) {
            var container = bodyContainer;
        } else {
            var templatePart = options.templatePart !== undefined ? options.templatePart : 'content';
            var container = bodyContainer.querySelector('[x-template-part="' + templatePart + '"]');
        }
        addElementInContainer(element, container);
    };

    x.addToProfile = (element) => {
        x.add(element, { templatePart: 'profile' });
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


    css += '.x-block-post[x-content*="s"]{overflow:hidden;}'; // to enable the x-block make it round
    css += '.x-block-post>.x-block-post-text{' + textStyle + 'margin-top:-5px;margin-bottom:-5px;word-break:break-word;}';
    css += '.x-block-post>.x-block-post-text-light{' + darkTextStyle + '}';
    css += '.x-block-post>.x-block-post-text-light a{' + darkTextStyle + '}';
    css += '.x-block-post>.x-block-post-text-dark{' + lightTextStyle + '}';
    css += '.x-block-post>.x-block-post-text-dark a{' + lightTextStyle + '}';
    css += '.x-block-post>.x-block-post-date{' + textStyle + 'color:#666;font-size:13px;margin-top:' + contentSpacing + ';}';
    css += '.x-block-post[x-content*="u"]>.x-block-post-text{padding-top:' + contentSpacing + ';}';
    css += '.x-block-post>.x-block-post-attachment{overflow:hidden;margin-top:' + contentSpacing + ';}';
    css += '.x-block-post[x-content*="s"]>.x-block-post-attachment{margin-left:-' + contentSpacing + ';width:calc(100% + 2*' + contentSpacing + ');margin-bottom:-' + contentSpacing + ';}';
    css += '.x-block-post[x-content*="s"]:not([x-content*="t"]):not([x-content*="u"])>.x-block-post-attachment{margin-top:-' + contentSpacing + ';}';
    css += '.x-block-post[x-content*="m"]>.x-block-post-attachment{border-radius:4px;}';
    css += '.x-block-post[x-content*="f"]>.x-block-post-attachment{border-radius:8px;}';
    css += '.x-block-post[x-content*="f"]>.x-block-post-text a{text-decoration:underline;cursor:pointer;}';
    css += '.x-block-post[x-content*="m"]>.x-block-post-text a{text-decoration:underline;}';
    css += '.x-block-post[x-content*="s"]>.x-block-post-text a{text-decoration:underline;}';
    css += '.x-block-post[x-content*="f"]>.x-block-post-text p+br{display:none;}';
    css += '.x-block-post[x-content*="f"]>.x-block-post-text br+br{margin-top:15px;content:"";display:block;}';
    css += '.x-block-post[x-content*="m"]>.x-block-post-text p+br{display:none;}';
    css += '.x-block-post[x-content*="m"]>.x-block-post-text br+br{margin-top:15px;content:"";display:block;}';
    css += '.x-block-post[x-content*="s"]>.x-block-post-text p+br{display:none;}';
    css += '.x-block-post[x-content*="s"]>.x-block-post-text br+br{margin-top:10px;content:"";display:block;}';
    css += '.x-block-post[x-content*="f"]>.x-block-post-text ul{list-style-position:inside;margin:0;padding:0;}';
    css += '.x-block-post[x-content*="f"]>.x-block-post-text ol{list-style-position:inside;margin:0;padding:0;}';
    css += '.x-block-post[x-content*="s"]>.x-block-post-text ul{list-style-position:inside;margin:0;padding:0;}';
    css += '.x-block-post[x-content*="s"]>.x-block-post-text ol{list-style-position:inside;margin:0;padding:0;}';
    //css += '.x-block-post{max-height:300px;}';

    var makePostElement = async (post, options = {}) => {
        var mode = options.mode !== undefined ? options.mode : 'full'; // summary, attachment
        var showGroup = options.showGroup !== undefined ? options.showGroup : false;
        var showUser = options.showUser !== undefined ? options.showUser : true;
        var theme = options.theme !== undefined ? options.theme : (mode === 'attachment' ? 'light' : 'dark');
        var hasText = post.text !== null && post.text.length > 0;
        var hasAttachments = post.attachments.getCount() > 0;

        var contentElementsSelectors = [];
        var container = document.createElement('div');
        if (mode === 'summary') {
            container.setAttribute('class', 'x-block x-block-click x-block-dark x-block-dark-click x-block-post'); //x-block-light-click
            contentElementsSelectors.push('s'); // summary mode
            container.setAttribute('tabindex', '0');
            container.setAttribute('role', 'button');
        } else if (mode === 'attachment') {
            container.setAttribute('class', 'x-block-post');
            contentElementsSelectors.push('m'); // attachment mode
        } else {
            container.setAttribute('class', 'x-block-post');
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

            // var userButton = await x.makeProfileButton(authorPropertyType, authorPropertyID, { imageSize: 40 });//, inline: true
            // container.appendChild(userButton.element);

            var profileComponent = await x.makeProfilePreviewComponent(authorPropertyType, authorPropertyID, {
                size: 'small'
            });
            container.appendChild(profileComponent.element);

            container.appendChild(x.makeSeparator().element);
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
            textElement.setAttribute('class', 'x-block-post-text ' + (theme === 'light' ? 'x-block-post-text-light' : 'x-block-post-text-dark'));
            //textElement.style.color = theme === 'light' ? '#000' : '#fff';
            if (post.textType === 'r') { // rich
                textElement.innerHTML = x.convertRichText(post.text, mode === 'full' ? 'default' : 'preview');
            } else {
                textElement.innerHTML = x.convertText(post.text);
            }
            if (mode === 'full') {
                textElement.style.marginTop = 'calc(' + contentSpacing + ' - 5px)';
                textElement.style.paddingLeft = contentSpacing;
                textElement.style.paddingRight = contentSpacing;
                textElement.style.marginBottom = 'calc(' + contentSpacing + ' - 5px)';
            }
            container.appendChild(textElement);
        }

        if (hasAttachments) {
            contentElementsSelectors.push('a');
            var attachment = post.attachments.get(post.attachments.getIDs()[0]);
            var attachmentContainer = document.createElement('div');
            attachmentContainer.setAttribute('class', 'x-block-post-attachment');
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
            container.appendChild(x.makeSeparator().element);
            var dateElement = document.createElement('div');
            dateElement.setAttribute('class', 'x-block-post-date');
            dateElement.innerText = x.getHumanDate(post.date, 'Published');
            dateElement.style.paddingLeft = contentSpacing;
            dateElement.style.paddingRight = contentSpacing;
            container.appendChild(dateElement);
        }
        container.setAttribute('x-content', contentElementsSelectors.join(''));
        return container;
    };

    x.makePostsListComponent = async (source, options) => {
        var listOptions = options === undefined ? {} : x.shallowCopyObject(options);
        listOptions.mode = 'summary';
        var addButton = listOptions.addButton !== undefined ? listOptions.addButton : null;
        var emptyText = listOptions.emptyText !== undefined ? listOptions.emptyText : null;
        var visiblePostIDs = [];
        var newestPostDate = null;
        var postsPerLoadedPage = 20;
        var sourceOptions = {
            order: 'desc',
            offset: 0,
            limit: postsPerLoadedPage
        };

        var container = x.makeContainer({ addSpacing: true });

        if (addButton !== null) {
            var addButtonDetails = typeof addButton === 'function' ? await addButton() : addButton;
            if (addButtonDetails !== null) {
                container.add(x.makeButton(addButtonDetails.text, addButtonDetails.onClick, { style: 'style2' }));
            }
        }

        var emptyTextHint = null;
        if (emptyText !== null) {
            emptyTextHint = x.makeHint(emptyText, { visible: false });
            container.add(emptyTextHint);
        }

        var list = x.makeList({
            type: 'blocks', // grid
            showSpacing: true,
            visible: false
        });
        container.add(list);

        var showModeButtonText = 'Show more';
        var showMoreButton = x.makeButton(showModeButtonText, async () => {
            showMoreButton.setText('Loading');
            showMoreButton.disable();
            sourceOptions.limit += postsPerLoadedPage;
            await loadPosts();
            showMoreButton.setText(showModeButtonText);
            showMoreButton.enable();
        }, { textAlign: 'center', visible: false });
        container.add(showMoreButton);

        var loadPosts = async () => {
            var sourceOptionsToSend = x.shallowCopyObject(sourceOptions);
            if (visiblePostIDs.length > sourceOptionsToSend.limit) {
                sourceOptionsToSend.limit = visiblePostIDs.length;
            }
            sourceOptionsToSend.limit++; // Add one to know if there is show more button
            var posts = await source(sourceOptionsToSend);

            var itemsToAddFirst = [];
            var itemsToAddLast = [];
            var loadedPostIDs = [];
            var newVisiblePostIDs = [];
            for (var i = 0; i < posts.length; i++) {
                var post = posts[i];
                var postID = post.id; // todo there may be 2 posts from different users/groups
                loadedPostIDs.push(postID);
                if (i === sourceOptionsToSend.limit - 1) { // the last post that's used for the show more button only
                    continue;
                }
                newVisiblePostIDs.push(postID);
                if (visiblePostIDs.indexOf(postID) !== -1) {
                    continue;
                }
                var element = await makePostElement(post, listOptions);
                var args = { postID: postID };
                if (post.groupID !== undefined) {
                    args.groupID = post.groupID;
                } else if (post.userID !== undefined) {
                    args.userID = post.userID;
                }
                x.addClickToOpen(element, { location: 'posts/post', args: args, preload: true });
                var addFirst = newestPostDate !== null && post.date >= newestPostDate;
                if (newestPostDate === null || newestPostDate < post.date) {
                    newestPostDate = post.date;
                }
                if (addFirst) {
                    itemsToAddFirst.push({ id: postID, element: element });
                } else {
                    itemsToAddLast.push({ id: postID, element: element });
                }
            };
            if (itemsToAddFirst.length > 0) {// todo dont add new ones, but show notification, unless added by the current user
                itemsToAddFirst.reverse();
                for (var item of itemsToAddFirst) {
                    list.add(item, 'first');
                }
            }
            if (itemsToAddLast.length > 0) {
                list.addMultiple(itemsToAddLast);
            }

            var itemsToRemove = x.arrayDifference(visiblePostIDs, loadedPostIDs);
            for (var postIDToRemove of itemsToRemove) {
                list.remove(postIDToRemove);
            }

            visiblePostIDs = x.arrayUnique(visiblePostIDs.concat(newVisiblePostIDs));

            if (loadedPostIDs.length > sourceOptions.limit) {
                showMoreButton.show();
            } else {
                showMoreButton.hide();
            }
            if (loadedPostIDs.length === 0) {
                if (emptyTextHint !== null) {
                    emptyTextHint.show();
                }
                list.hide();
            } else {
                if (emptyTextHint !== null) {
                    emptyTextHint.hide();
                }
                list.show();
            }
        };

        var component = x.makeComponent(async () => {
            await loadPosts();
            return container;
        });
        component.update = async () => {
            await loadPosts();
        };
        component.getLastSeen = () => {
            return visiblePostIDs;
        };
        return component;
    };

    x.makePostPreviewComponent = (postFunction, options) => {
        var elementOptions = options === undefined ? {} : x.shallowCopyObject(options);
        elementOptions.mode = 'full';
        return x.makeComponent(async () => {
            var post = await postFunction();
            var element = await makePostElement(post, elementOptions);
            var container = document.createElement('div');
            container.appendChild(element);
            return {
                element: container
            };
        });
    };

    //css += '.x-discussion-container .x-block-post:not(:last-child){margin-bottom:5px;}';
    css += '.x-discussion-container .x-dpost > *{' + textStyle + 'box-sizing:border-box;cursor:default;color:#fff;padding:7px 12px;border-radius:5px;display:inline-block;line-height:160%;max-width:100%;word-break:break-word;position:relative;}';
    css += '.x-discussion-container .x-dpost > *:hover{background-color:#222222;}';
    css += '.x-discussion-container .x-dpost > [x-notification-badge]{background-color:#222222;}';
    css += '.x-discussion-container .x-dpost > * p+br{display:none;}';
    css += '.x-discussion-container .x-dpost > * br+br{margin-top:10px;content:"";display:block;}';
    css += '.x-discussion-container .x-dpost > * a{text-decoration:underline;cursor:pointer;color:#5ac1ff;' + textStyle + '}';
    css += '.x-discussion-container .x-dpost > * ul{list-style-position:inside;margin:0;padding:0;}';
    css += '.x-discussion-container .x-dpost > * ol{list-style-position:inside;margin:0;padding:0;}';
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
                    if (serverList[post.id] === undefined) {
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
        loadMoreContainer.setAttribute('style', 'padding-left:48px;padding-bottom:' + contentSpacing + ';');
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
            if (hasText) {
                if (post.textType === 'r') { // rich
                    contentElement.innerHTML = x.convertRichText(post.text);
                } else {
                    contentElement.innerHTML = x.convertText(post.text);
                }
            }

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

    var makeImageButton = (onClick, imageElement, imageSize, text = null, options = {}) => {
        var details = options.details !== undefined ? options.details : null;
        var hint = options.hint !== undefined ? options.hint : null;
        var styleID = options.style !== undefined ? options.style : 'style2'; // style1 - no background, style2 - with background

        var container = document.createElement('div');
        container.setAttribute('class', 'x-block x-block-click ' + (modal ? (styleID === 'style2' || styleID === 'style3' ? 'x-block-light ' : '') + 'x-block-light-click' : (styleID === 'style2' ? 'x-block-dark ' : '') + 'x-block-dark-click'));
        container.style.display = 'inline-flex';
        container.style.position = 'relative';
        if (styleID === 'style3') {
            container.style.borderRadius = '0';
            container.style.marginLeft = '-' + contentSpacing;
            container.style.width = 'calc(100% + 2*' + contentSpacing + ')';
            container.style.maxWidth = 'calc(100% + 2*' + contentSpacing + ')';
        }
        container.setAttribute('tabindex', '0');
        container.setAttribute('role', 'button');

        var hasImage = imageElement !== null;

        if (hasImage) {
            container.appendChild(imageElement);
        }

        var textsContainer = document.createElement('div');
        textsContainer.setAttribute('style', (hasImage ? 'min-height:' + imageSize + 'px;' : '') + 'padding-left:' + (hasImage ? 'calc(' + imageSize + 'px + 15px)' : '5px') + ';padding-right:5px;display:flex;flex-direction:column;justify-content:center;box-sizing:border-box;max-width:100%;');

        if (text !== null) {
            var textElement = document.createElement('div');
            textElement.setAttribute('style', textStyle + (modal ? darkTextStyle : lightTextStyle) + 'text-overflow:ellipsis;overflow:hidden;white-space:nowrap;max-width:100%;');
            textElement.innerText = text;
            textsContainer.appendChild(textElement);
        }

        if (details !== null) {
            var textElement = document.createElement('div');
            textElement.setAttribute('style', textStyle + (modal ? darkTextStyle : lightTextStyle) + 'font-size:12px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;max-width:100%;');
            textElement.innerText = details;
            textsContainer.appendChild(textElement);
        }
        if (hint !== null) {
            var textElement = document.createElement('div');
            textElement.setAttribute('style', textStyle + (modal ? darkTextStyle + lightHintStyle : lightTextStyle + darkHintStyle) + 'padding-top:2px;font-size:12px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;max-width:100%;');
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

    x.makeIcon = (icon, options = {}) => {
        var size = options.size !== undefined ? options.size : 100;
        var align = options.align !== undefined ? options.align : 'center';
        var color = options.color !== undefined ? options.color : '#555';
        var imageElement = document.createElement('div');
        imageElement.setAttribute('style', 'margin-top:20px;margin-bottom:45px;background-color:#f5f5f5;border-radius:50%;width:' + size + 'px;height:' + size + 'px;background-repeat:no-repeat;background-position:center;background-size:50%;' + (align === 'center' ? 'margin-left:auto;margin-right:auto;' : ''));
        if (icon !== null) {
            imageElement.style.backgroundImage = 'url(\'' + x.getIconDataURI(icon, color, size / 2) + '\')';
        }
        return imageElement;
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
        var imageSize = options.imageSize !== undefined ? options.imageSize : 50;
        var imageElement = await getProfileImageElement(type, id, imageSize);
        var button = makeImageButton(onClick, imageElement, imageSize, text, options);
        if (!hasCustomOnClick && !hasCustomText) {
            var title = 'Visit ' + profile.name + '\'s profile';
            button.element.setAttribute('title', title);
            button.element.setAttribute('aria-label', title);
        }
        return button;
    };

    x.makeIconButton = (onClick, icon, text = null, options = {}) => {//, inline
        var imageSize = options.imageSize !== undefined ? options.imageSize : 30;
        var imageElement = document.createElement('div');
        imageElement.setAttribute('style', 'background-color:#333;box-sizing:border-box;width:' + imageSize + 'px;height:' + imageSize + 'px;border-radius:50%;background-size:70%;background-repeat:no-repeat;background-position:center;');
        if (icon !== null) {
            imageElement.style.backgroundImage = 'url(\'' + x.getIconDataURI(icon, '#fff', imageSize) + '\')';
        }
        return makeImageButton(onClick, imageElement, imageSize, text, options);//, inline
    };

    x.makeTextButton = (onClick, text, options = {}) => {
        return makeImageButton(onClick, null, null, text, options);
    };

    var makeUserHeaderElement = async (propertyType, propertyID, options = {}) => {
        var profile = await x.property.getProfile(propertyType, propertyID);
        var text = options.text !== undefined ? options.text : '';
        var groupID = options.groupID !== undefined ? options.groupID : null;
        var theme = options.theme !== undefined ? options.theme : 'dark';
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
    css += '.x-small-post-form .x-add-button{border-radius:0;border-bottom-right-radius:8px;border-top-left-radius:4px;}';
    css += '.x-small-post-form .x-add-button:hover{background-color:rgba(255,255,255,0.04);}';
    css += '.x-small-post-form .x-add-button:active{background-color:rgba(255,255,255,0.08);}';
    css += '.x-small-post-form .x-add-button:focus{background-color:rgba(255,255,255,0.08);}';

    x.makePostForm = async (post, options = {}) => {
        if (post === undefined || post === null) {
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

        var submitText = options.submitText !== undefined ? options.submitText : (editMode ? "Save changes" : "Publish");
        var clearOnSubmit = options.clearOnSubmit !== undefined ? options.clearOnSubmit : false;
        var type = options.type !== undefined ? options.type : 'block';

        if (options.attachment !== undefined) {
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
            // container.style.position = 'relative';
            // var userImageElement = await getProfileImageElement(profilePropertyType, profilePropertyID, 30);
            // userImageElement.style.position = 'absolute';
            // userImageElement.style.marginTop = edgeContentSpacing;
            // userImageElement.style.marginLeft = edgeContentSpacing;
            // container.appendChild(userImageElement);
        }

        var formContainer = document.createElement('div');
        formContainer.setAttribute('style', (type === 'small' ? 'background-color:rgba(255,255,255,0.08);border-radius:8px;' : 'padding-top:10px;'));//margin-left:50px;

        var fieldText = x.makeFieldRichTextarea(null, {
            //placeholder: (typeof options.placeholder !== 'undefined' ? options.placeholder : ''),
            maxLength: 2000,
            height: type === 'block' ? '200px' : '86px',
            theme: theme
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
        if (post.textType === 'r') { // rich text
            fieldText.setValue(post.text, 'richText');
        } else {
            fieldText.setValue(post.text, 'text');
        }

        var attachmentContainer = document.createElement('div');
        attachmentContainer.setAttribute('style', 'display:flex;' + (type === 'small' ? 'float:right;' : 'padding-top:' + contentSpacing + ';'));
        formContainer.appendChild(attachmentContainer);
        var rebuildAttachmentUI = async () => {
            attachmentContainer.innerHTML = '';
            if (post.attachments.getCount() > 0) {
                var firstAttachment = post.attachments.get(post.attachments.getIDs()[0]);
                var attachmentPreviewElement = await x.makeAttachmentPreviewElement(firstAttachment, { theme: theme, size: 48 });
                attachmentPreviewElement.setAttribute('tabindex', '0');
                attachmentPreviewElement.setAttribute('role', 'button');
                var attachmentPreviewElementTitle = 'Attachment';
                attachmentPreviewElement.setAttribute('aria-label', attachmentPreviewElementTitle);
                attachmentPreviewElement.setAttribute('title', attachmentPreviewElementTitle);
                x.addClickToOpen(attachmentPreviewElement, e => {
                    var tooltip = x.makeTooltip(document.body);
                    // tooltip.addButton('Preview', () => {
                    //     x.alert('Not implemented yet!');
                    // });
                    tooltip.addButton('Remove', () => {
                        post.attachments.deleteAll();
                        rebuildAttachmentUI();
                    });
                    tooltip.show(e.target);
                });
                var attachmentPreviewContainer = document.createElement('div');
                attachmentPreviewContainer.setAttribute('style', (type === 'small' ? 'border-bottom-right-radius:8px;border-top-left-radius:4px;' : 'border-radius:4px;box-shadow:0 0 0 1px rgba(0,0,0,0.1) inset;') + 'cursor:pointer;width:48px;height:48px;overflow:hidden;background-color:rgba(255,255,255,0.04);');
                attachmentPreviewContainer.appendChild(attachmentPreviewElement);
                attachmentContainer.appendChild(attachmentPreviewContainer);
            } else {
                var attachmentButton = document.createElement('div');
                attachmentButton.setAttribute('title', 'Add an attachment');
                attachmentButton.setAttribute('class', 'x-add-button');
                attachmentButton.setAttribute('style', (type === 'small' ? '' : 'border:1px solid #ccc;border-radius:4px;') + 'width:48px;height:48px;box-sizing:border-box;background-repeat:no-repeat;background-size:40% 40%;background-position:center;cursor:pointer;');
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
                    tooltip.show(e.target);
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
            post.textType = 'r';
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
                reader.addEventListener('load', () => {
                    fileInput.parentNode.removeChild(fileInput);
                    callback({
                        name: file.name,
                        dataURI: reader.result
                    });
                });
                reader.addEventListener('error', e => {
                    // todo
                });
                reader.readAsDataURL(file);
            };
        });
        document.body.appendChild(fileInput);
        fileInput.click();
    };

    var systemPick = (type, callback, options) => {
        x.open('system/pick', { type: type, options: options }, { modal: true, width: 300 })
            .then(async result => {
                if (result !== null && result.id !== undefined) {
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

    css += '.x-unavailable{font-size:12px;padding:' + contentSpacing + '}';

    var makeUnavailableContentElement = (text = 'Content is unavailable') => {
        var element = document.createElement('div');
        element.setAttribute('class', 'x-unavailable');
        element.innerText = text;
        return element;
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
        container.innerHTML = '<div style="' + (aspectRatio === null ? '' : 'position:absolute;top:0;left:0;width:100%;height:100%;overflow:hidden;') + '' + textStyle + (isLightTheme ? '' : 'color:#fff;') + 'font-size:12px;"></div>';//line-height:150%;background:#eee;border:1px dotted #ccc;//border-bottom-left-radius:2px;border-bottom-right-radius:2px;
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
                    var element = await makePostElement(post, { mode: 'attachment', theme: theme });
                }
                container.firstChild.appendChild(element);
            } else {
                var element = makeUnavailableContentElement('Attached post by ' + x.getShortID(propertyID) + ' is unavailable');
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

    x.makeProfilePreviewComponent = (type, id, options = {}) => {

        var size = options.size !== undefined ? options.size : 'big';
        var imageSize = 200;
        if (size === 'medium') {
            imageSize = 150;
        } else if (size === 'small') {
            imageSize = 40;
        }

        if (size === 'small') {
            var component = x.makeComponent(async () => {
                var container = document.createElement('div');
                container.setAttribute('style', 'padding-top:30px;');
                var userButton = await x.makeProfileButton(type, id, { imageSize: imageSize, style: 'style1' });
                container.appendChild(userButton.element);
                return {
                    element: container
                };
            });
        } else {
            var component = getProfileContainer(async (component) => {
                var result = {};

                var details = await getPropertyProfile(type, id);

                // IMAGE

                var imageContainer = document.createElement('div');
                imageContainer.setAttribute('style', 'height:' + imageSize + 'px;position:relative;');

                var imageElement = await getProfileImageElement(type, id, imageSize);
                imageElement.style.position = 'relative';
                imageElement.style.zIndex = '2';
                imageContainer.appendChild(imageElement);

                if (type === 'group' && options.groupUserID !== undefined) {

                    if (x.currentUser.exists()) {
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
                }

                if (type === 'groupMember') {
                    var [groupID, userID] = id.split('$');
                    var groupImageSize = Math.floor(imageSize * 66 / 200);
                    var memberElement = await getProfileImageElement('group', groupID, groupImageSize);
                    memberElement.style.position = 'relative';
                    memberElement.style.boxSizing = 'border-box';
                    memberElement.style.zIndex = '3';
                    memberElement.style.position = 'relative';
                    memberElement.style.marginLeft = (imageSize - groupImageSize) + 'px';
                    memberElement.style.marginTop = '-' + groupImageSize + 'px';
                    memberElement.style.boxShadow = modal ? '0 0 0 4px #fff' : '0 0 0 4px #111';
                    if (size === 'big') {
                        memberElement.style.cursor = 'pointer';
                        x.addClickToOpen(memberElement, { location: 'group/home', args: { id: groupID }, preload: true });
                    }
                    imageContainer.appendChild(memberElement);
                    component.observeChanges(['group/' + groupID + '/profile']);
                }

                if (options.showEditButton !== undefined && options.showEditButton) {
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
                    }, {
                        icon: 'edit',
                        iconColor: '#777',
                        style: 'style5',
                        title: type === 'group' ? 'Customize group' : 'Edit profile'
                    });
                    editButton.element.style.width = '42px';
                    editButton.element.style.float = 'right';
                    editButton.element.style.borderRadius = '50%';
                    editButton.element.style.position = 'absolute';
                    editButton.element.style.zIndex = '1';
                    editButton.element.style.right = '-8px';
                    editButton.element.style.top = '-8px';
                    imageContainer.appendChild(editButton.element);
                }

                result.imageElement = imageContainer;

                // TEXT + TEXT HINT
                result.title = details.name;

                var idText = null;
                if (type === 'user') {
                    idText = x.isPrivateID(id) ? 'private profile' : x.getShortID(id);
                } else if (type === 'groupMember') {
                    var [groupID, userID] = id.split('$');
                    idText = x.isPrivateID(userID) ? 'private profile' : x.getShortID(userID);
                }
                if (idText !== null) {
                    result.titleHint = idText;
                }

                // DETAILS
                if (size === 'big') {
                    var descriptionText = details.description !== null ? details.description.trim() : '';
                    if (type === 'groupMember') {
                        descriptionText = ''; // no description
                        var [groupID, userID] = id.split('$');
                        var memberData = await x.services.call('group', 'getMemberData', { groupID: groupID, userID: userID })
                        if (memberData !== null) {
                            if (memberData.status === 'pendingApproval') {
                                if (descriptionText.length !== 0) {
                                    descriptionText += "\n\n";
                                }
                                if (userID === x.currentUser.getID()) {
                                    descriptionText += 'Your membership must be approved by an administrator. Until then you can edit your profile (image, name, etc.).';
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
                        result.details = descriptionText;
                        result.emptyText = descriptionText;
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

                        result.titleButton = {
                            onClick: () => {
                                x.open('group/members', { id: id });
                            },
                            text: text
                        };
                        component.observeChanges(['group/' + id + '/members']);
                    }
                }

                // BUTTONS
                if (size === 'big') {

                    var getFollowButton = async () => {
                        var currentUserExists = x.currentUser.exists();
                        var isFollowing = currentUserExists ? await x.services.call('explore', 'isFollowing', { type: type, id: id }) : false;
                        var button = x.makeButton(isFollowing ? 'Following' : 'Follow', async () => {
                            if (currentUserExists) {
                                x.open('explore/followForm', { id: x.getTypedID(type, id) }, { modal: true, width: 300 });
                            } else {
                                x.requireUser({ type: type === 'user' ? 'followUser' : 'followGroup', id: id });
                            }
                        }, { style: 'style2', icon: 'explore' });
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

                    var buttons = [];

                    if (type === 'user') {
                        if (x.isPublicID(id)) {
                            if (id !== x.currentUser.getID()) {
                                buttons.push(await getFollowButton());
                                var connectButtons = await getConnectButtons(id);
                                for (var button of connectButtons) {
                                    buttons.push(button);
                                }
                            }
                        }
                    } else if (type === 'groupMember') {
                        var [groupID, userID] = id.split('$');
                        if (userID === x.currentUser.getID()) {
                            buttons.push(x.makeButton('Leave group', async () => {
                                var result = await x.open('group/membership', { id: groupID }, { modal: true, width: 300 });
                                if (result === 'left') {
                                    x.showMessage('You\'ve successfully left the group!');
                                }
                            }, { style: 'style2' }));
                        } else {
                            if (userID !== x.currentUser.getID() && x.isPublicID(userID)) {
                                buttons.push(x.makeButton('Visit', async () => {
                                    x.open('user/home', { userID: userID });
                                }, { style: 'style2' }));
                                var connectButtons = await getConnectButtons(userID);
                                for (var button of connectButtons) {
                                    buttons.push(button);
                                }
                            }
                        }
                    } else if (type === 'group') {
                        component.observeChanges(['group/' + id + '/member/' + x.currentUser.getID()]);
                        if (x.currentUser.exists()) {
                            var memberGroupDetails = await x.services.call('groups', 'getDetails', { groupID: id, details: ['status', 'invitedBy'] });
                            if (memberGroupDetails !== null) {
                                var status = memberGroupDetails.status;
                                if (status === 'joined') {
                                    // FOLLOW BUTTON
                                    buttons.push(await getFollowButton());

                                    // INVITE BUTTON
                                    buttons.push(x.makeButton('', () => {
                                        x.open('group/invite', { id: id }, { modal: true, width: 300 });
                                    }, { style: 'style2', icon: 'group-plus' }));
                                } else {
                                    // JOIN BUTTON
                                    var text = null;
                                    if (status === 'pendingApproval') {
                                        text = 'Pending approval';
                                    } else if (status === null) {
                                        text = 'Join/Leave';
                                    }
                                    buttons.push(x.makeButton(text, async () => {
                                        var result = await x.open('group/membership', { id: id }, { modal: true, width: 300 });
                                        if (result === 'left') {
                                            x.showMessage('You\'ve successfully left the group!');
                                        }
                                    }, { style: 'style2' }));
                                }

                            }
                        } else {
                            buttons.push(x.makeButton('Join', async () => {
                                x.requireUser({ type: 'joinGroup', id: id });
                            }, { style: 'style2' }));
                        }
                    }
                    result.buttons = buttons;
                }

                return result;
            }, options);
        }
        component.observeChanges([type + '/' + id + '/profile']);
        return component;
    };

    css += '.x-profile{position:relative;display:flex;flex-direction:column;align-items:center;}';
    css += '.x-profile-title{padding-top:' + contentSpacing + ';max-width:100%;overflow:hidden;text-align:center;text-overflow:ellipsis;}';
    css += '.x-profile-title-hint{padding-top:6px;max-width:100%;overflow:hidden;text-align:center;text-overflow:ellipsis;}'; // 6px to match button style4
    css += '.x-profile-title-button{margin-button:-6px;}'; // to make buttons closer if not details added. todo: add style text-button + details
    css += '.x-profile-empty-title{display:none;}';
    css += '.x-profile-details{padding-top:calc(' + contentSpacing + ' - 4px);' + textStyle + 'color:#fff;word-break:break-word;text-align:center;width:100%;padding-left:' + edgeContentSpacing + ';padding-right:' + edgeContentSpacing + ';box-sizing:border-box;max-width:300px;}';
    css += '.x-profile-hint{padding-top:calc(2*' + contentSpacing + ');' + hintStyle + 'word-break:break-word;text-align:center;width:100%;padding-left:' + edgeContentSpacing + ';padding-right:' + edgeContentSpacing + ';box-sizing:border-box;max-width:300px;}';
    css += '.x-profile-empty-text{' + textStyle + 'word-break:break-word;text-align:center;padding-top:calc(2*' + contentSpacing + ');display:none;}';
    css += '.x-profile-buttons{padding-top:calc(2*' + contentSpacing + ');display:flex;flex-direction:row;justify-content:center;}';
    css += '.x-profile-buttons > *:not(:first-child){margin-left:10px;}';
    css += '.x-profile-action-button{padding-top:calc(2*' + contentSpacing + ');max-width:100%;}';
    css += 'body[x-template="empty"] .x-profile-empty-text{display:block;}';
    css += 'body[x-template="empty"] .x-profile-empty-title{display:block;}';
    css += 'body[x-template="empty"] .x-profile-details{display:none;}';
    css += 'body[x-template="empty"] .x-profile-hint{display:none;}';

    var getProfileContainer = function (dataCallback, options) {
        var component = x.makeComponent(async (component) => {
            var container = document.createElement('div');
            var size = options.size !== undefined ? options.size : 'big';
            container.setAttribute('class', 'x-profile');
            if (size === 'big') {
                container.setAttribute('style', 'margin-top:90px;margin-bottom:60px;');
            } else if (size === 'medium') {
                container.setAttribute('style', 'margin-top:20px;margin-bottom:30px;');
            } else {
                container.setAttribute('style', 'margin-top:60px;margin-bottom:40px;');
            }

            var theme = options.theme !== undefined ? options.theme : 'dark';

            var data = await dataCallback(component);

            if (data.imageElement !== undefined) {
                container.appendChild(data.imageElement);
            }

            var title = options.title !== undefined ? options.title : (data.title !== undefined ? data.title : null);
            if (title !== null) {
                var titleContainer = document.createElement('div');
                titleContainer.setAttribute('class', 'x-profile-title');
                titleContainer.setAttribute('style', (theme === 'dark' ? lightTextStyle : darkTextStyle) + titleStyle);
                titleContainer.innerText = title;
                container.appendChild(titleContainer);
            }

            var emptyTitle = options.emptyTitle !== undefined ? options.emptyTitle : (data.emptyTitle !== undefined ? data.emptyTitle : null);
            if (emptyTitle !== null) {
                var emptyTitleContainer = document.createElement('div');
                emptyTitleContainer.setAttribute('class', 'x-profile-title x-profile-empty-title');
                emptyTitleContainer.setAttribute('style', (theme === 'dark' ? lightTextStyle : darkTextStyle) + titleStyle);
                emptyTitleContainer.innerText = emptyTitle;
                container.appendChild(emptyTitleContainer);
            }

            var titleHint = options.titleHint !== undefined ? options.titleHint : (data.titleHint !== undefined ? data.titleHint : null);
            if (titleHint !== null) {
                var titleHintContainer = document.createElement('div');
                titleHintContainer.setAttribute('class', 'x-profile-title-hint');
                titleHintContainer.setAttribute('style', (theme === 'dark' ? lightHintStyle : darkHintStyle) + titleStyle + 'font-weight:normal;font-size:13px;');
                titleHintContainer.innerText = titleHint;
                container.appendChild(titleHintContainer);
            }

            var titleButton = options.titleButton !== undefined ? options.titleButton : (data.titleButton !== undefined ? data.titleButton : null);
            if (titleButton !== null) {
                var titleButtonDetails = typeof titleButton === 'function' ? await titleButton() : titleButton;
                if (titleButtonDetails !== null) {
                    var titleButtonContainer = document.createElement('div');
                    titleButtonContainer.setAttribute('class', 'x-profile-title-button');
                    titleButtonContainer.appendChild(x.makeButton(titleButtonDetails.text, titleButtonDetails.onClick, { style: 'style4' }).element);
                    container.appendChild(titleButtonContainer);
                }
            }

            var details = options.details !== undefined ? options.details : (data.details !== undefined ? data.details : null);
            if (details !== null) {
                var detailsContainer = document.createElement('div');
                detailsContainer.setAttribute('class', 'x-profile-details');
                detailsContainer.innerText = details;
                container.appendChild(detailsContainer);
            }

            var hint = options.hint !== undefined ? options.hint : (data.hint !== undefined ? data.hint : null);
            if (hint !== null) {
                var hintContainer = document.createElement('div');
                hintContainer.setAttribute('class', 'x-profile-hint');
                hintContainer.setAttribute('style', theme === 'dark' ? lightHintStyle : darkHintStyle);
                hintContainer.innerText = hint;
                container.appendChild(hintContainer);
            }

            var emptyText = options.emptyText !== undefined ? options.emptyText : (data.emptyText !== undefined ? data.emptyText : null);
            if (emptyText !== null) {
                var emptyTextContainer = document.createElement('div');
                emptyTextContainer.setAttribute('class', 'x-profile-empty-text');
                emptyTextContainer.setAttribute('style', (size === 'small' ? 'padding-top:40px;' : '') + (theme === 'dark' ? lightTextStyle : darkTextStyle));
                emptyTextContainer.innerText = emptyText;
                container.appendChild(emptyTextContainer);
            }

            var buttons = options.buttons !== undefined ? options.buttons : (data.buttons !== undefined ? data.buttons : null);
            if (buttons !== null && buttons.length > 0) {
                var buttonsContainer = document.createElement('div');
                buttonsContainer.setAttribute('class', 'x-profile-buttons');
                for (let button of buttons) {
                    buttonsContainer.appendChild(button.element);
                }
                container.appendChild(buttonsContainer);
            }

            var actionButton = options.actionButton !== undefined ? options.actionButton : (data.actionButton !== undefined ? data.actionButton : null);
            if (actionButton !== null) {
                var actionButtonDetails = typeof actionButton === 'function' ? await actionButton() : actionButton;
                if (actionButtonDetails !== null) {
                    var actionButtonContainer = document.createElement('div');
                    actionButtonContainer.setAttribute('class', 'x-profile-action-button');
                    actionButtonContainer.appendChild(x.makeButton(actionButtonDetails.text, actionButtonDetails.onClick, { style: 'style3' }).element);
                    container.appendChild(actionButtonContainer);
                }
            }

            return {
                element: container
            }
        });
        return component;
    };

    x.makeAppPreviewComponent = (appID, options = {}) => {
        //var newOptions = x.shallowCopyObject(options);
        //var imageSize = options.imageSize !== undefined ? options.imageSize : 100;
        //newOptions.imageSize = imageSize;
        var imageSize = 100;
        options.size = 'small';
        return getProfileContainer(async () => {
            var imageElement = document.createElement('div');
            imageElement.setAttribute('style', 'width:' + imageSize + 'px;height:' + imageSize + 'px;border-radius:50%;background-size:50%;background-position:center;background-color:#222;background-repeat:no-repeat;');
            imageElement.style.backgroundImage = 'url(\'' + x.getIconDataURI(appID === 'home' ? 'notification' : appID, '#eee') + '\')';
            return {
                imageElement: imageElement
            };
        }, options);
    };

    x.makeSmallProfilePreviewComponent = (type, id, options = {}) => {
        var imageSize = 100;
        options.size = 'small';
        return getProfileContainer(async () => {
            var imageElement = await getProfileImageElement(type, id, imageSize);
            return {
                imageElement: imageElement
            };
        }, options);
    };



    css += '.x-block-secret{padding:0;}';
    css += '.x-block-secret > :first-child{padding:10px 10px 10px ' + contentSpacing + ';font-size:11px;line-height:20px;user-select:none;color:#999;background-size:16px;background-repeat:no-repeat;background-position:center right 10px;height:20px;}';
    css += '.x-block-secret > .x-button{border-radius:0;padding-left:' + contentSpacing + ';}';
    css += '.x-block-secret > .x-button:last-child{border-bottom-left-radius:8px;border-bottom-right-radius:8px;}';

    x.makeSecretComponent = (title, callback) => {
        var component = x.makeComponent(async () => {
            var container = document.createElement('div');
            container.setAttribute('class', 'x-block x-block-dark x-block-secret');
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