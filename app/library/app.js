/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

(x) => {

    // todo var => let

    var hasHandeledAnError = false;
    var handleError = async error => {
        if (hasHandeledAnError) {
            return;
        }
        hasHandeledAnError = true;
        var error = x.makeAppError(error);
        setTimeout(async () => {
            await backAllModals();
            error.location = location.toString();
            var state = history.state;
            if (state !== null) {
                error.state = {
                    type: state.type,
                    details: state.details !== undefined ? {
                        location: state.details.location
                    } : null
                };
            }
            error.date = (new Date()).toUTCString();
            x.open('system/reportError', { error: JSON.stringify(error) }, { modal: true });
        }, 1000);
        // todo log errors and show button, then clear
    };
    self.addEventListener('error', e => {
        e.preventDefault();
        handleError(e);
    });
    self.addEventListener('unhandledrejection', e => {
        e.preventDefault();
        handleError(e);
    });

    var css = '';

    // WINDOWS

    var windows = {};

    var getNextVisibilityIndex = () => {
        var maxIndex = 0
        for (var windowID in windows) {
            var window = windows[windowID];
            if (window.visibilityIndex !== null && window.visibilityIndex > maxIndex) {
                maxIndex = window.visibilityIndex;
            }
        }
        return maxIndex + 1;
    };

    var modalBackgroundPositionTimeout = null;
    var modalBackgroundIndicatorTimeout = null;
    var updateModalBackground = () => {
        var container = document.querySelector('.x-app-modals-background');
        if (!container) {
            return;
        }
        var hasVisibleModals = false;
        //var hasVisibleMenu = document.querySelector('.x-app-menu').getAttribute('x-visible') === '1';
        var hasOtherModals = false;
        var allLoadeded = true;
        for (var windowID in windows) {
            var window = windows[windowID];
            if (window.exists && window.modal === true) {
                hasOtherModals = true;
                if (window.isVisible()) {
                    hasVisibleModals = true;
                }
                if (!window.isLoaded()) {
                    allLoadeded = false;
                }
            }
        }
        var indicator = container.firstChild;
        if (hasVisibleModals) {// || hasVisibleMenu
            clearTimeout(modalBackgroundPositionTimeout);
            container.style.zIndex = 139;//hasVisibleMenu ? 129 : 139;
            container.style.opacity = 1;
            indicator.style.opacity = 0;
            updateAppScreenAccessibility(false);
            if (allLoadeded) {
                clearTimeout(modalBackgroundIndicatorTimeout);
            } else {
                modalBackgroundIndicatorTimeout = setTimeout(() => {
                    indicator.style.opacity = 1;
                }, 1000);
            }
        } else {
            if (!hasOtherModals) {
                clearTimeout(modalBackgroundIndicatorTimeout);
                container.style.opacity = 0;
                indicator.style.opacity = 0;
                updateAppScreenAccessibility(true);
                modalBackgroundPositionTimeout = setTimeout(() => {
                    container.style.zIndex = 1;
                }, x.modalsAnimationTime + 16);
            }
        }
    };

    var backingAllModals = false;
    var backAllModals = async () => {
        backingAllModals = true;
        for (var i = 0; i < 100; i++) {
            var state = history.state;
            if (state !== null && state.type === 'window' && state.details.modal === true) {
                await historyBack();
            } else {
                break;
            }
        }
        backingAllModals = false;
    };

    var makeWindow = (location, args = {}, options = {}) => {
        var locationParts = location.split('/');
        var appID = locationParts[0];
        var viewID = locationParts[1];
        var modal = options.modal !== undefined ? options.modal : false;
        var openerID = options.openerID !== undefined ? options.openerID : null;
        var windowID = x.generateID();

        var container = document.createElement('div');
        document.querySelector('.x-app-screen').appendChild(container);

        var window = {
            id: windowID,
            modal: modal,
            openerID: openerID,
            visible: false,
            visibilityIndex: null,
            announcedChanges: [],
            channel: null,
            container: container,
            exists: true
        };

        var initializePromise = new Promise((resolve, reject) => {
            try {
                var frame = document.createElement('iframe');
                frame.setAttribute('sandbox', 'allow-scripts');
                frame.addEventListener('load', async () => {
                    window.channel = x.createMessagingChannel('window-iframe', frame);
                    window.channel.addListener('call', async args => {
                        return await x.processProxyCall(args.method, args.args, { appID: appID, windowID: windowID });
                    });
                    await window.channel.send('initialize', {
                        args: args,
                        width: typeof options.width !== 'undefined' ? options.width : (modal ? 500 : null),
                        showBackButton: openerID !== null
                    });
                    resolve();
                });
                var app = x.getApp(appID);
                var content = app.views[viewID];
                var contextData = {
                    userID: x.currentUser.getID()
                };
                frame.srcdoc = '<html><head><meta charset="utf-8"><title></title></head><body x-type="' + (modal ? 'modal' : 'default') + '"><script>self.xc=' + JSON.stringify(contextData) + ';self.x=' + JSON.stringify({ animationTime: x.animationTime, modalsAnimationTime: x.modalsAnimationTime, version: x.version }) + ';' + x.library.get(['utilities', 'sandboxProxy', 'sandboxWindow'], 'self.x') + 'self.main=(args)=>{' + content + '};</script></body></html>';
                container.appendChild(frame);
                container.setAttribute('class', modal ? 'x-app-modal' : 'x-app-window');
                frame.setAttribute('tabindex', '-1');
                frame.setAttribute('aria-hidden', 'true');
            } catch (e) {
                reject();
            }
        });

        window.update = async () => {
            if (!window.exists) {
                return;
            }
            if (window.announcedChanges.length > 0) {
                var announcedChanges = x.shallowCopyArray(window.announcedChanges);
                window.announcedChanges = [];
                await initializePromise;
                await window.channel.send('update', announcedChanges);
            }
        };
        window.show = async (addToHistory, updateVisibilityIndex) => {
            if (!window.exists) {
                return;
            }
            if (modal && backingAllModals) {
                return;
            }
            if (addToHistory === undefined) {
                addToHistory = true;
            }
            if (typeof updateVisibilityIndex === 'undefined') {
                updateVisibilityIndex = true;
            }
            if (updateVisibilityIndex) {
                window.visibilityIndex = getNextVisibilityIndex();
            }
            var title = null;
            var hash = null; // todo
            var historyState = {
                type: 'window',
                details: {
                    userID: x.currentUser.getID(),
                    windowID: windowID,
                    modal: modal,
                    openerID: openerID,
                    visibilityIndex: window.visibilityIndex,
                    location: location,
                    args: args
                }
            };
            if (addToHistory) {
                pushLocationState(historyState);
            } else {
                replaceLocationState(historyState);
            }
            var promisesToWait = [];
            for (var otherWindowID in windows) {
                if (otherWindowID === windowID) {
                    continue;
                }
                var otherWindow = windows[otherWindowID];
                if (modal && !otherWindow.modal) {
                    otherWindow.setAccessibility(false);
                    continue;
                }
                if (!modal && otherWindow.modal) {
                    promisesToWait.push(otherWindow.close());
                } else if (otherWindow.isVisible()) {
                    promisesToWait.push(otherWindow.hide());
                }
            }
            if (container.getAttribute('x-loaded') === 'true') {
                promisesToWait.push(Promise.resolve(window.update()));
            }
            await Promise.allSettled(promisesToWait);
            container.setAttribute('x-visible', '1');
            updateModalBackground();
            await initializePromise;
            var result = await window.channel.send('show');
            if (JSON.stringify(history.state) === JSON.stringify(historyState)) {
                var title = result.title !== undefined ? result.title : null;
                var hash = result.hash !== undefined ? result.hash : null;
                replaceLocationState(historyState, modal ? '' : title, hash);
            }
            container.setAttribute('x-loaded', 'true');
            window.setAccessibility(true);
            updateModalBackground();
            //console.log('window.show ' + windowID);
            //console.log(historyState);
        };
        window.hide = async () => {
            window.setAccessibility(false);
            //console.log('window.hide ' + windowID);
            if (!modal) {
                try {
                    await Promise.resolve(new Promise((resolve) => {
                        try {
                            window.channel.send('hide')
                                .then(resolve)
                                .catch(resolve);
                        } catch (e) { }
                        setTimeout(resolve, x.animationTime + 16);
                    }));
                } catch (e) {

                }
            }
            try {
                container.setAttribute('x-visible', '0');
            } catch (e) {

            }
        };
        window.setAccessibility = async accessible => {
            var frame = container.firstChild;
            frame.setAttribute('tabindex', accessible ? '0' : '-1');
            frame.setAttribute('aria-hidden', accessible ? 'false' : 'true');
            window.channel.send('setAccessibility', { accessible: accessible });
        };
        window.isVisible = () => {
            if (!window.exists) {
                return false;
            }
            return container.getAttribute('x-visible') === '1';
        };
        window.isLoaded = () => {
            if (!window.exists) {
                return false;
            }
            return container.getAttribute('x-loaded') === 'true';
        };
        window.close = async () => {
            if (!window.exists) {
                return;
            }
            //console.log('window.close ' + windowID);
            window.exists = false;
            window.visibilityIndex = null;
            updateModalBackground();
            if (modal) {
                container.setAttribute('x-closed', '1');
                await Promise.resolve(new Promise(resolve => {
                    setTimeout(resolve, x.modalsAnimationTime + 16);
                }));
            }
            await window.hide();
            updateModalBackground();
            window.channel.destroy();
            if (container.parentNode !== null) {
                container.parentNode.removeChild(container);
            }
            delete windows[windowID];
        };
        windows[windowID] = window;
        return window;

    };

    var getWindow = windowID => {
        return typeof windows[windowID] !== 'undefined' && windows[windowID].exists ? windows[windowID] : null;
    };

    var closeAllWindows = async () => {
        var promisesToWait = [];
        for (var windowID in windows) {
            promisesToWait.push(windows[windowID].close());
        }
        await Promise.allSettled(promisesToWait);
    };

    var closeLastLoadingModalWindow = () => {
        var state = history.state;
        var type = state !== null && typeof state.type !== 'undefined' ? state.type : null;
        if (type === 'window') {
            var stateDetails = state.details;
            var window = getWindow(stateDetails.windowID);
            if (window !== null) {
                if (window.modal && window.isVisible() && !window.isLoaded()) {
                    historyBack();
                    //history.back();
                }
            }
        }
    };


    // API PROXY

    var preloadedWindows = {};

    x.open = async (location, args, options = {}) => {
        var modal = typeof options.modal !== 'undefined' ? options.modal : false;
        if (!modal) {
            await backAllModals();
        }
        var addToHistory = typeof options.addToHistory !== 'undefined' ? options.addToHistory : true;
        var window = makeWindow(location, args, options);
        await window.show(addToHistory);
        return window;
    };

    x.preload = (location, args, options) => {
        var window = makeWindow(location, args, options);
        var windowID = window.id;
        preloadedWindows[windowID] = {
            location: location,
            args: args,
            options: options,
            expireTimeout: setTimeout(() => {
                var window = getWindow(windowID);
                if (window !== null) {
                    window.close();
                }
            }, 2000)
        };
        return windowID;
    };

    x.openPreloaded = async windowID => {
        var preloadData = preloadedWindows[windowID];
        clearTimeout(preloadData.expireTimeout);
        var window = getWindow(windowID);
        if (window !== null) {
            await window.show();
        } else {
            await x.open(preloadData.location, preloadData.args, preloadData.options, false);
        }
        delete preloadedWindows[windowID];
    };

    x.alert = text => {
        alert(text);
    };

    x.confirm = text => {
        return confirm(text);
    };

    x.downloadFile = async (dataURI, name) => {
        var a = document.createElement("a");
        a.href = dataURI;
        a.setAttribute("download", name);
        a.click();
    };

    x.addProxyCallHandler(options => {
        //var appID = typeof options.appID !== 'undefined' ? options.appID : null;
        var windowID = typeof options.windowID !== 'undefined' ? options.windowID : null;

        return {
            open: (location, args, options = {}) => {
                options.openerID = windowID;
                x.open(location, args, options);
            },
            preload: (location, args, options = {}) => {
                options.openerID = windowID;
                return x.preload(location, args, options);
            },
            openPreloaded: x.openPreloaded,
            backPrepare: async () => { // prepare other windows // todo prepare just previous ???
                for (var otherWindowID in windows) {
                    if (otherWindowID !== windowID) {
                        var otherWindow = windows[otherWindowID];
                        await otherWindow.update();
                    }
                }
            },
            back: async (result, options = {}) => {
                var openerToSendTo = null;
                // send result always even if its null
                var window = getWindow(windowID);
                if (window !== null && window.openerID !== null) {
                    var openerToSendTo = getWindow(window.openerID);
                }
                if (typeof options.closeAllModals !== 'undefined' && options.closeAllModals) {
                    await backAllModals();
                } else {
                    await historyBack();
                    //history.back();
                }
                if (openerToSendTo !== null) {
                    try {
                        //console.log('openResult', result);
                        openerToSendTo.channel.send('openResult', result);
                    } catch (e) {
                        // ignore
                    }
                }
            },
            alert: x.alert,
            confirm: x.confirm,
            downloadFile: x.downloadFile,
            error: e => {
                handleError(JSON.parse(e));
            },
            'currentUser.logout': async () => {
                if (x.confirm('Are you sure you want to log out your profile?')) {
                    await showLoadingScreen();
                    await closeAllWindows();
                    var result = await x.currentUser.logout();
                    if (result === true) {
                        await showWelcomeScreen();
                    }
                }
            },
            'currentUser.setNewPassword': async (oldPassword, newPassword) => {
                return await x.currentUser.setNewPassword(oldPassword, newPassword);
            },
            requireUser: async context => {
                await closeAllWindows();
                await showWelcomeScreen(true, context);
            },
        };
    });


    //css += '.x-app-screen{x-screen x-app-screen;z-index:3;}';
    css += '.x-app-window{position:fixed;left:100vw;top:0;width:100vw;height:calc(100vh - 50px);overflow:hidden;background-color:#111;z-index:2;}';//transition:opacity 300ms ease;
    css += '.x-app-window[x-visible="1"]{left:0;}';//opacity:1;
    css += '.x-app-window[x-visible="0"]{left:100vw;}';//opacity:0;
    css += '.x-app-window>iframe{position:relative;border:0;width:100%;height:100%;z-index:2;}';

    css += '.x-app-modals-background{background:rgba(0,0,0,0.8);user-select:none;transition:opacity ' + x.modalsAnimationTime + 'ms;opacity:0;position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;display:flex;align-items:center;justify-content:center;}';
    css += '.x-app-modals-background > div{transition:opacity ' + x.modalsAnimationTime + 'ms;opacity:0;animation:x-rotate 1s infinite linear;width:20px;height:20px;background-position:center;background-size:cover;background-repeat:no-repeat;background-image:url(\'' + x.loadingImage + '\')}';
    css += '.x-app-modal{position:fixed;top:100vh;left:0;width:100vw;height:100vh;overflow:hidden;z-index:150;transition:top ' + x.modalsAnimationTime + 'ms ease, left ' + x.modalsAnimationTime + 'ms ease;}';
    css += '.x-app-modal>iframe{position:relative;border:0;width:100%;height:100%;z-index:151;}';
    css += '.x-app-modal[x-visible="1"]:not([x-closed])[x-loaded]{top:0;left:0;}';
    css += '.x-app-modal[x-visible="0"]:not([x-closed]){top:0;left:-100vw;}';
    css += '.x-app-modal[x-visible="1"][x-closed]{top:100vh;left:0;}';
    css += '.x-app-modal[x-visible="0"][x-closed]{top:100vh;left:-100vw;}';

    css += '.x-app-toolbar-left{display:none;}';
    css += '.x-app-toolbar-bottom{z-index:100;position:fixed;box-sizing:border-box;display:flex;background-color:#222;box-shadow:0 0 5px 0 #111;flex-direction:row;bottom:0;left:0;width:100vw;height:50px;justify-content:center;}';
    css += '.x-app-toolbar-bottom>.x-app-toolbar-button{max-width:100px;}';
    css += '.x-app-toolbar-bottom > *{flex:1 1 auto;}';

    // css += '.x-app-menu-button{z-index:131;width:42px;height:42px;position:fixed;top:0;right:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}';
    // css += '.x-app-menu-button .x-app-toolbar-user-image{background-color:#333;width:25px;height:25px;display:block;border-radius:50%;cursor:pointer;background-size:cover;background-position:center;flex:0 0 auto;}';
    // css += '.x-app-menu{background-color:rgba(0,0,0,0);transition:background-color ' + x.animationTime + 'ms ease;user-select:none;display:none;align-items:flex-end;justify-content:flex-end;position:fixed;z-index:132;top:0;left:-100vw;width:100%;height:100%;}';
    // css += '.x-app-menu > div{padding:42px 15px 15px 15px;position:relative;box-sizing:border-box;color:#000;background-color:#fff;box-shadow:0 0 2px 0 rgba(0,0,0,0.5);display:flex;flex-direction:column;height:100vh;transition:transform ' + x.animationTime + 'ms ease;transform:translateX(100%);}';
    // css += '.x-app-menu[x-visible]{display:flex;left:0;}';
    // css += '.x-app-menu[x-visible] > div{transform:translateX(0);}';
    // css += '.x-app-menu .x-app-toolbar-button{height:42px;cursor:pointer;}';
    // css += '.x-app-menu .x-app-toolbar-button:hover{background-color:rgba(255,255,255,0.04);}';
    // css += '.x-app-menu .x-app-toolbar-button:active{background-color:rgba(255,255,255,0.08);}';
    // css += '.x-app-menu .x-app-toolbar-button:first-child{border-top-left-radius:2px;border-top-right-radius:2px;}';
    // css += '.x-app-menu .x-app-toolbar-button:last-child{border-bottom-left-radius:2px;border-bottom-right-radius:2px;}';
    // css += '.x-app-menu .x-app-toolbar-button-app{background-size:20px;background-repeat:no-repeat;background-position:12px center;padding-left:43px;line-height:44px;padding-right:15px;}';
    // css += '.x-app-menu .x-app-menu-close-button{position:absolute;top:0;right:0;background-repeat:no-repeat;background-position:center;background-size:20px;width:42px;height:42px;}';

    css += '.x-app-toolbar-user-image{background-color:#333;width:25px;height:25px;display:block;border-radius:50%;cursor:pointer;background-size:cover;background-position:center;flex:0 0 auto;}';
    css += '.x-app-toolbar-button{width:50px;height:50px;user-select:none;display:flex;justify-content:center;align-items:center;box-sizing:border-box;cursor:pointer;}';
    css += '.x-app-toolbar-button-app{font-size:0;color:transparent;background-size:20px;background-repeat:no-repeat;background-position:center;}';
    css += '.x-app-toolbar-button:hover{background-color:rgba(255,255,255,0.04);}';
    css += '.x-app-toolbar-button:active{background-color:rgba(255,255,255,0.08);}';
    css += '.x-app-toolbar-button:focus{background-color:rgba(255,255,255,0.08);}';

    css += '.x-app-toolbar-button[x-home-app]{align-items:flex-start;}';
    css += '.x-app-toolbar-button[x-home-app]>span:not(:empty){width:20px;height:20px;line-height:21px;text-align:center;display:block;background:#24a4f2;color:#fff;font-size:11px;border-radius:50%;margin-top:4px;margin-left:14px;font-weight:bold;}';

    css += '@media only screen and (min-width:600px){';
    // css += '.x-app-menu-button{display:none !important;}';
    // css += '.x-app-menu{display:none !important;}';
    css += '.x-app-toolbar-left{z-index:100;position:fixed;box-sizing:border-box;display:flex;justify-content:space-between;border-right:1px solid #222;flex-direction:column;top:0;left:0;width:50px;height:100vh;}';
    css += '.x-app-toolbar-bottom{display:none;}';
    //css += '.x-app-toolbar-left>div{display:flex;flex-direction:row;}';
    css += '.x-app-window{max-width:calc(100vw - 50px);height:100vh;}';//240px
    css += '.x-app-window[x-visible="1"]{left:50px;}';//240px
    css += '*{scrollbar-width:thin;scrollbar-color:#666 transparent;}';
    css += '*::-webkit-scrollbar{width:6px;}';
    css += '*::-webkit-scrollbar-track{background: transparent;}';
    css += '*::-webkit-scrollbar-thumb{background-color:#666;}';
    css += '}';

    // for (var icon in x.icons) { // optimize
    //     css += '.x-icon-' + icon + '{background-image:url(\'data:image/svg+xml;base64,' + btoa(x.icons[icon]) + '\')}';
    // }

    // css += '.x-tooltip{position:fixed;z-index:201;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,0);}';
    // css += '.x-tooltip > div{position:relative;z-index:202;min-width:50px;min-height:20px;box-shadow:0 0 2px 0 rgba(0,0,0,0.5);display:inline-flex;flex-direction:column;background-color:#333;border-radius:4px;}';
    // css += '.x-tooltip a{color:#fff;line-height:42px;width:100%;padding:0 16px;height:42px;box-sizing:border-box;display:inline-block;cursor:pointer;}';
    // css += '.x-tooltip a:first-child{border-top-left-radius:2px;border-top-right-radius:2px;}';
    // css += '.x-tooltip a:last-child{border-bottom-left-radius:2px;border-bottom-right-radius:2px;}';
    // css += '.x-tooltip a:hover{background-color:rgba(255,255,255,0.04);}';
    // css += '.x-tooltip a:active{background-color:rgba(255,255,255,0.08);}';

    // HISTORY & LOCATION

    // #{propertyid}/p/
    // #{propertyid}
    var hashHandlers = {
        'p/': async (type, propertyID, value) => {
            var postID = value.substr(2).toLowerCase(); // todo postid
            await showAppScreen(false);
            await x.open('posts/post', { userID: propertyID, postID: postID }, { addToHistory: false });
            return true;
        },
        '': async (type, propertyID, path, secret) => {
            if (type === 'user') {
                // var connectKey = value.substr(2).toLowerCase(); // todo validate key
                // showAppScreen(false, () => {
                //     x.open('user/home', { userID: propertyID, connectKey: connectKey }, { addToHistory: false });
                // });
                await showAppScreen(false);
                await x.open('user/home', { userID: propertyID }, { addToHistory: false });
                return true;
            } else if (type === 'group') {
                if (secret.length > 0) {
                    if (x.currentUser.exists()) {
                        await showAppScreen(false);
                        await x.services.call('groups', 'addURLInvitation', { groupID: propertyID, accessKey: secret });
                        await x.open('group/home', { id: propertyID }, { addToHistory: false });
                        return true;
                    } else {
                        await showWelcomeScreen(false);
                    }
                }
            }
            return false;
        },
    };

    var updateLocationState = (isPush, state, title, hash) => {
        var title = title !== undefined ? title : 'Dots Mesh';
        var hash = hash !== undefined && hash !== null ? '#' + hash : ' ';
        if (isPush) {
            history.pushState(state, title, hash);
            lastCheckedLocationStateKey = null;
        } else {
            history.replaceState(state, title, hash);
        }
        document.title = title;
    };

    var pushLocationState = (state, title, hash) => {
        updateLocationState(true, state, title, hash);
    };

    var replaceLocationState = (state, title, hash) => {
        updateLocationState(false, state, title, hash);
    };

    var historyBackPromise = null;
    var historyBack = () => {
        //console.log('history.back');
        history.back();
        return new Promise((resolve, reject) => {
            historyBackPromise = [() => {
                historyBackPromise = null;
                resolve();
            }, e => {
                historyBackPromise = null;
                reject(e);
            }];
        });
    };

    var lastCheckedLocationStateKey = null;
    var processLocationState = async () => {
        try {
            var state = history.state;
            var hash = location.hash;
            var locationStateKey = JSON.stringify(state) + '$' + (state === null ? JSON.stringify(hash) : '');
            if (lastCheckedLocationStateKey === locationStateKey) {
                return;
            }
            var showHome = async () => {
                if (x.currentUser.isPublic()) {
                    await showAppScreen(false);
                    await x.open('home/home', {}, { addToHistory: false });
                } else if (x.currentUser.isPrivate()) {
                    await showAppScreen(false);
                    await x.open('explore/home', {}, { addToHistory: false });
                } else {
                    await showWelcomeScreen(false);
                }
            };
            //console.log('processLocationState - start');
            lastCheckedLocationStateKey = locationStateKey;
            if (state === null && hash.length > 1) {
                var hashValue = hash.substr(1).trim();
                if (hashValue.substr(0, 3) === '-n:') {
                    signupData.profileKey = hashValue.substr(3, hashValue.length);
                    if (x.currentUser.exists()) {
                        await showHome();
                    } else {
                        await showWelcomeScreen();
                        await showSignupScreen(2);
                    }
                    return true;
                }
                var slashIndex = hashValue.indexOf('/');
                var type = 'user';
                if (hashValue.substr(0, 2) === 'g:') {
                    type = 'group';
                    hashValue = hashValue.substr(2);
                }
                var propertyID = slashIndex === -1 ? hashValue : hashValue.substr(0, slashIndex);
                var colonIndex = propertyID.indexOf(':');
                var secret = '';
                if (colonIndex !== -1) {
                    secret = propertyID.substr(colonIndex + 1);
                    propertyID = propertyID.substr(0, colonIndex);
                }
                propertyID = x.getFullID(propertyID.toLowerCase());
                var suffix = slashIndex === -1 ? '' : hashValue.substr(slashIndex + 1);
                //if (x.isPublicID(propertyID)) {
                var callback = null;
                for (var prefix in hashHandlers) {
                    if (suffix.indexOf(prefix) !== -1) {
                        callback = hashHandlers[prefix];
                        break;
                    }
                }
                if (callback !== null) {
                    if (await callback(type, propertyID, suffix, secret)) {
                        return true;
                    }
                }
                //}
                replaceLocationState(null, null, null); // not supported hash
            }
            var type = state !== null && typeof state.type !== 'undefined' ? state.type : null;
            var hasUser = x.currentUser.exists();
            if (type === null) { // home
                await closeAllWindows();
                await showHome();
            } else if (type === 'welcome-screen') { // home
                await closeAllWindows();
                await showWelcomeScreen(false, state.context);
            } else if (type === 'app-screen') {
                await closeAllWindows();
                await showHome();
            } else if (type === 'window') {
                var stateDetails = state.details;
                if (stateDetails.userID === x.currentUser.getID()) {
                    await showAppScreen(false);
                    var windowID = stateDetails.windowID;
                    var window = getWindow(windowID);
                    if (stateDetails.modal && window === null) {
                        await historyBack(); // navigating to modal windows is forbidden
                        //history.back(); // navigating to modal windows is forbidden
                        return;
                    }
                    if (window !== null) {
                        var visibilityIndex = window.visibilityIndex;
                        for (var otherWindowID in windows) {
                            var otherWindow = windows[otherWindowID];
                            if (otherWindow.visibilityIndex > visibilityIndex) {
                                await otherWindow.close();
                            }
                        }
                        await window.show(false, false);
                    } else if (typeof stateDetails.location !== 'undefined' && typeof stateDetails.args !== 'undefined') {
                        await x.open(stateDetails.location, stateDetails.args, {
                            addToHistory: false,
                            openerID: typeof stateDetails.openerID !== 'undefined' ? stateDetails.openerID : null
                        });
                    }
                } else {
                    await showHome();
                }
            } else if (type === 'home-screen') {
                if (!hasUser) {
                    var details = state.details;
                    if (details.indexOf('error') !== -1) {
                        await historyBack(); // dont go to errors
                        //history.back();
                    }
                    if (details.indexOf('login#') === 0) {
                        await showLoginScreen(false);
                    } else if (details.indexOf('signup#') === 0) {
                        if (!await showSignupScreen(parseInt(details.substr('signup#'.length)), false)) {
                            await historyBack(); // invalid screen
                            //history.back();
                        }
                    } else if (details.indexOf('private#new') === 0) {
                        await showNewPrivateUserScreen(false);
                    } else if (details.indexOf('private#continue') === 0) {
                        await showContinuePrivateUserScreen(false);
                    }
                } else {
                    await historyBack();
                    //history.back();
                }
            }
            //console.log('processLocationState - done');
            if (historyBackPromise !== null) {
                historyBackPromise[0]();
            }
        } catch (e) {
            if (historyBackPromise !== null) {
                historyBackPromise[1](e);
            } else {
                throw e;
            }
        }
    }

    window.addEventListener("hashchange", e => {
        processLocationState();
    }, false);

    window.addEventListener("popstate", e => {
        processLocationState();
    }, false);



    // console.log('MILLISECONDS');
    // var date = Date.now();
    // console.log(date + ' - ' + date.toString().length + ' - ' + (new Date(date)).toString());
    // var xdate = date.toString(36);
    // console.log(xdate + ' - int - ' + xdate.toString().length + ' - ' + (new Date(parseInt(xdate, 36))).toString());
    // xdate = 'z'.repeat(8);
    // console.log(xdate + ' - base36 - ' + xdate.toString().length + ' - ' + (new Date(parseInt(xdate, 36))).toString());
    // xdate = '0' + 'z'.repeat(8);
    // console.log(xdate + ' - begin - ' + xdate.toString().length + ' - ' + (new Date(parseInt(xdate, 36))).toString());
    // xdate = 'z' + 'z'.repeat(8);
    // console.log(xdate + ' - end - ' + xdate.toString().length + ' - ' + (new Date(parseInt(xdate, 36))).toString());

    // console.log('SECONDS');
    // var date = Math.floor(Date.now() / 1000);
    // console.log(date + ' - int - ' + date.toString().length + ' - ' + (new Date(date * 1000)).toString());
    // var xdate = date.toString(36);
    // console.log(xdate + ' - int - ' + xdate.toString().length + ' - ' + (new Date(parseInt(xdate, 36) * 1000)).toString());
    // xdate = 'z'.repeat(6);
    // console.log(xdate + ' - base36 - ' + xdate.toString().length + ' - ' + (new Date(parseInt(xdate, 36) * 1000)).toString());
    // xdate = '0' + 'z'.repeat(6);
    // console.log(xdate + ' - begin - ' + xdate.toString().length + ' - ' + (new Date(parseInt(xdate, 36) * 1000)).toString());
    // xdate = 'z' + 'z'.repeat(6);
    // console.log(xdate + ' - end - ' + xdate.toString().length + ' - ' + (new Date(parseInt(xdate, 36) * 1000)).toString());

    // console.log('DAYS');
    // var date = Math.floor(Date.now() / 1000 / 86400);
    // console.log(date + ' - int - ' + date.toString().length + ' - ' + (new Date(date * 1000 * 86400)).toString());
    // var xdate = date.toString(36);
    // console.log(xdate + ' - int - ' + xdate.toString().length + ' - ' + (new Date(parseInt(xdate, 36) * 1000 * 86400)).toString());
    // xdate = 'z'.repeat(3);
    // console.log(xdate + ' - base36 - ' + xdate.toString().length + ' - ' + (new Date(parseInt(xdate, 36) * 1000 * 86400)).toString());
    // xdate = '0' + 'z'.repeat(3);
    // console.log(xdate + ' - begin - ' + xdate.toString().length + ' - ' + (new Date(parseInt(xdate, 36) * 1000 * 86400)).toString());
    // xdate = 'z' + 'z'.repeat(3);
    // console.log(xdate + ' - end - ' + xdate.toString().length + ' - ' + (new Date(parseInt(xdate, 36) * 1000 * 86400)).toString());


    // HOME SCREEN

    //css += '.x-home-screen{display:flex;align-items:center;}';

    css += '.x-home-screen-content{font-family:' + x.fontFamily + ';max-width:480px;margin:0 auto;padding:20px;display:flex;flex-direction:column;overflow:hidden;display:flex;justify-content:center;min-height:100vh;box-sizing:border-box;}';//background-position:center 20px;background-size:20px;background-repeat:no-repeat;background-image:url(\'data:image/svg+xml;base64,' + btoa(x.logo) + '\')
    css += '.x-home-screen-content >*{max-width:360px;margin:0 auto;}';
    css += '.x-home-screen-content >*:not(:first-child){margin-top:15px;}';
    css += '.x-welcome-screen-header{background-size:480px;background-position:top center;background-repeat:no-repeat;background-image:url(?app&h960&v=3);padding-top:200px;}';

    css += '.x-home-screen-back-button{width:50px;height:50px;cursor:pointer;position:absolute;top:0;left:0;background-size:20px;background-position:center center;background-repeat:no-repeat;background-image:url(\'' + x.getIconDataURI('back', '#999') + '\');}';
    css += '.x-home-screen-back-button>span{display:block;width:calc(100% - 10px);height:calc(100% - 10px);margin-top:5px;margin-left:5px;border-radius:50%;}';
    css += '.x-home-screen-back-button:hover>span{background-color:rgba(255,255,255,0.04);}';
    css += '.x-home-screen-back-button:active>span{background-color:rgba(255,255,255,0.08);}';
    css += '.x-home-screen-back-button:focus>span{background-color:rgba(255,255,255,0.08);}';

    css += '.x-home-screen-title{text-align:center;font-weight:bold;font-size:25px;line-height:160%;}';
    css += '.x-home-screen-textbox{font-family:' + x.fontFamily + ';max-width:260px;text-align:center;display:block;border:0;border-radius:8px;width:100%;padding:0 13px;height:48px;box-sizing:border-box;background-color:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:15px;}';
    css += '.x-home-screen-textbox:focus{border:1px solid rgba(255,255,255,0.3);}';
    css += '.x-home-screen-button{user-select:none;font-size:15px;display:inline-block;border-radius:8px;padding:0 30px;min-height:48px;box-sizing:border-box;background-color:rgba(255,255,255,1);color:#111;line-height:48px;text-align:center;cursor:pointer;text-decoration:none;}';
    css += '.x-home-screen-button:hover{background-color:rgba(255,255,255,0.96);}';
    css += '.x-home-screen-button:active{background-color:rgba(255,255,255,0.92);}';
    css += '.x-home-screen-button:focus{background-color:rgba(255,255,255,0.92);}';
    css += '.x-home-screen-button-2{background-color:rgba(255,255,255,0.04);color:#fff;}';
    css += '.x-home-screen-button-2:hover{background-color:rgba(255,255,255,0.08);}';
    css += '.x-home-screen-button-2:active{background-color:rgba(255,255,255,0.12);}';
    css += '.x-home-screen-button-2:focus{background-color:rgba(255,255,255,0.12);}';
    css += ".x-home-screen-button-3{text-align:left;height:auto;border-radius:8px;line-height:100%;padding:18px 19px 17px 19px;width:260px;background-image:url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' stroke='%23aaa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' fill='none' %3e%3cpath d='M10 6l6 6-6 6'/%3e%3c/svg%3e\");background-repeat:no-repeat;background-position:right 10px center;background-size:24px;}";
    css += '.x-home-screen-button-3>span{font-size:12px;display:block;padding-top:7px;color:#777;}';
    css += '.x-home-screen-text{font-size:15px;line-height:24px;text-align:center;}';
    css += '.x-home-screen-text-1{font-size:20px;font-weight:bold;}';
    css += '.x-home-screen-text a{text-decoration:underline;cursor:pointer;color:#fff;}';
    css += '.x-home-screen-hint{font-size:13px;line-height:24px;text-align:center;color:#999;}';//margin-top:20px;
    css += '.x-home-screen-hint a{text-decoration:underline;color:#999;}';
    css += '.x-home-screen-image-button{cursor:pointer;width:150px;height:150px;border-radius:50%;background-color:#fff;margin:0 auto;background-size:cover;background-position:center center;}';
    css += '.x-home-screen-image-button:focus{box-shadow:0 0 0 3px rgba(255,255,255,0.12);}';
    css += '.x-home-screen-image-preview{width:150px;height:150px;border-radius:50%;background-color:#333;margin:0 auto;background-size:cover;background-position:center center;}';

    var hideVisibleScreen = async () => {
        return new Promise((resolve, reject) => {
            try {
                var otherScreens = document.querySelectorAll('.x-screen[x-visible]');
                if (otherScreens.length > 0) {
                    otherScreens.forEach(otherScreen => {
                        otherScreen.removeAttribute('x-visible');
                        setTimeout(() => {
                            otherScreen.parentNode.removeChild(otherScreen);
                        }, x.modalsAnimationTime + 16);
                    });
                    setTimeout(resolve, x.modalsAnimationTime);
                } else {
                    resolve();
                }
            } catch (e) {
                reject(e);
            }
        });
    };

    var showLoadingScreen = async () => {
        var container = document.createElement('div');
        container.setAttribute('class', 'x-screen x-loading-screen');
        container.innerHTML = '<div></div>';
        document.body.appendChild(container);
        await hideVisibleScreen();
        container.setAttribute('x-visible', '1');
    };

    var makeHomeScreen = historyState => {
        if (typeof historyState === 'undefined') {
            historyState = null;
        }
        var container = document.createElement('div');
        container.setAttribute('class', 'x-screen x-home-screen');
        container.innerHTML = '<div class="x-home-screen-content"></div>';
        document.body.appendChild(container);
        var contentContainer = container.firstChild;

        var addedFields = {};

        var screen = null;

        var clickSubmitButton = () => {
            var button = container.querySelector('[x-role="submit"]');
            if (button !== null) {
                button.click();
            }
        }

        screen = {
            addBackButton: () => {
                var div = document.createElement('div');
                div.setAttribute('class', 'x-home-screen-back-button');
                div.setAttribute('tabindex', '0');
                div.setAttribute('role', 'button');
                div.setAttribute('aria-label', 'Back');
                div.innerHTML = '<span></span>'
                x.addClickToOpen(div, async () => {
                    await historyBack();
                    console.log(history.state);
                });
                container.appendChild(div);
            },
            addTitle: title => {
                var div = document.createElement('div');
                div.setAttribute('class', 'x-home-screen-title');
                div.innerText = title;
                contentContainer.appendChild(div);
            },
            addTextbox: (id, label) => {
                var input = document.createElement('input');
                input.setAttribute('class', 'x-home-screen-textbox');
                input.setAttribute('placeholder', label);
                input.setAttribute('aria-label', label);
                input.addEventListener('keydown', e => {
                    if (e.keyCode === 13) {
                        clickSubmitButton();
                    }
                });
                contentContainer.appendChild(input);
                addedFields[id] = input;
            },
            addPassword: (id, label) => {
                var input = document.createElement('input');
                input.setAttribute('class', 'x-home-screen-textbox');
                input.setAttribute('placeholder', label);
                input.setAttribute('aria-label', label);
                input.setAttribute('type', 'password');
                input.addEventListener('keydown', e => {
                    if (e.keyCode === 13) {
                        clickSubmitButton();
                    }
                });
                contentContainer.appendChild(input);
                addedFields[id] = input;
            },
            addSubmitButton: (text, callback, style) => {
                var button = screen.addButton(text, callback, style);
                button.setAttribute('x-role', 'submit');
            },
            addButton: (text, callback, style) => {
                var button = document.createElement('a');
                button.setAttribute('class', 'x-home-screen-button' + (style !== undefined ? ' x-home-screen-button-' + style : ''));
                button.setAttribute('tabindex', '0');
                button.setAttribute('role', 'button');
                button.innerHTML = text;
                contentContainer.appendChild(button);
                x.addClickToOpen(button, async () => {
                    try {
                        await callback();
                    } catch (e) {
                        alert(e.message);
                    }
                });
                return button;
            },
            addText: (text, style) => {
                var div = document.createElement('div');
                div.setAttribute('class', 'x-home-screen-text' + (style !== undefined ? ' x-home-screen-text-' + style : ''));
                div.innerText = text;
                contentContainer.appendChild(div);
            },
            addHint: html => {
                var div = document.createElement('div');
                div.setAttribute('class', 'x-home-screen-hint');
                div.innerHTML = html;
                contentContainer.appendChild(div);
            },
            addHTML: element => {
                var div = document.createElement('div');
                div.appendChild(element);
                contentContainer.appendChild(div);
            },
            getValue: id => {
                return addedFields[id].value.trim();
            },
            setValue: (id, value) => {
                return addedFields[id].value = value;
            },
            focus: id => {
                if (addedFields[id] !== undefined) {
                    addedFields[id].focus();
                }
            },
            show: async () => {
                if (historyState !== null) {
                    pushLocationState({
                        type: 'home-screen',
                        details: historyState
                    });
                }
                await hideVisibleScreen();
                container.setAttribute('x-visible', '1');
            },
            element: container
        };
        return screen;
    };

    var showWelcomeScreen = async (addToHistory, context) => {
        if (addToHistory === undefined) {
            addToHistory = true;
        }
        if (typeof context === 'undefined') {
            context = null;
        }
        //console.log(context);
        if (addToHistory) {
            pushLocationState({
                type: 'welcome-screen',
                context: context
            });
        }
        var screen = makeHomeScreen();
        if (context !== null) {
            screen.addBackButton();
        }
        screen.element.querySelector('.x-home-screen-content').classList.add('x-welcome-screen-header');
        var done = false;
        //console.log(context);
        if (context !== null) {
            if (context.type === 'follow') {
                var details = await x.services.call('profile', 'getDetails', { propertyType: 'user', propertyID: context.id, details: ['name'] });
                screen.addTitle('Hey, hello!' + "\n" + 'You\'ll need a profile for that!');
                screen.addText("\nA profile is required for following " + details.name + ". Luckily, that's easy. You can freely create a private one or sign up for a public one.\n\n");
                done = true;
            } else if (context.type === 'profile') {
                screen.addTitle('Hello!' + "\n" + 'Interested in your own profile?');
                screen.addText("\nA profile gives you the ability to follow and connect with others. It's free and unbelievably easy to create a private profile. You can also sign up for a public one.\n\n");
                done = true;
            }
        }
        if (!done) {
            // screen.addTitle('Your social platform!');
            // screen.addText("Public profiles, private messages and groups\nNo spam, no ads, no tracking");//\nHighly encrypted and distributed\nOpen source
        }

        var privateUsersIDs = await x.currentUser.getPrivateUsers();
        if (privateUsersIDs.length > 0) {
            screen.addButton('Continue with a private profile', async () => {
                await showContinuePrivateUserScreen();
            }, '3');
        }

        screen.addButton('Create new profile', async () => {
            await showSignupScreen();
        }, '3');

        screen.addButton('Sign in', async () => {
            await showLoginScreen();
        }, '3');
        var host = location.host;
        if (host === 'dotsmesh.com') {
            screen.addHint("<br><br>Dots Mesh is an open social platform.<br>This is the official app.");
        } else if (host === 'dev.dotsmesh.com') {
            screen.addHint("<br><br>Dots Mesh is an open social platform.<br>This is the latest dev version of the official app.<br>It may not be stable. Use at your own risk.");
        } else if (host === 'beta.dotsmesh.com') {
            screen.addHint("<br><br>Dots Mesh is an open social platform.<br>This is the beta version of the official app.<br>Submit a report if you find any errors.");
        } else if (host.indexOf('dotsmesh.') === 0) {
            screen.addHint("<br><br>Dots Mesh is an open social platform.<br>This app is hosted by " + host.substring(9) + ".<br><a href=\"https://" + host + "?host&admin\">Administrator panel</a>");
        } else {
            screen.addHint("<br><br>Dots Mesh is an open social platform.<br>This app is hosted by " + host + ".");
        }

        screen.addButton('Learn more', async () => {
            window.open('https://about.dotsmesh.com/', '_blank');
        }, '2');




        // screen.addText("");
        //screen.addHint('This is an early preview of the platform and many improvements are expected in the future. Your feedback is highly appreciated.');
        // screen.addText("");
        await screen.show();
    };

    var showLoginScreen = async addToHistory => {
        if (addToHistory === undefined) {
            addToHistory = true;
        }
        var screen = makeHomeScreen(addToHistory ? 'login#' : null);
        screen.addBackButton();
        screen.addTitle('Hello!');
        screen.addText('\nEnter your ID and password to\nlog in to your profile.');
        screen.addTextbox('id', 'ID');
        screen.addPassword('password', 'Password');
        screen.addSubmitButton('Log in', async () => {
            var id = screen.getValue('id').toLowerCase();
            var password = screen.getValue('password');
            if (id.length === 0) {
                alert('The ID is required!');
                screen.focus('id');
                return;
            }
            if (id.length < 3) {
                alert('The ID is must be atleast 3 characters long!');
                screen.focus('id');
                return;
            }
            if (password.length === 0) {
                alert('The password is required!');
                screen.focus('password');
                return;
            }
            await showLoadingScreen();
            var result = await x.currentUser.login(x.getFullID(id), password);
            if (result === true) {
                await showAppScreen(true);
                await x.open('home/home');
            } else {
                var text = 'An error occured. Please try again later!';
                if (result === 'invalidAuthKey') {
                    text = 'The password is incorrect!';
                } else if (result === 'userNotFound') {
                    text = 'Such user does not exists!';
                }
                var errorScreen = makeHomeScreen('login#error');
                errorScreen.addTitle('Oops!');
                errorScreen.addText("\n" + text + "\n\n");
                errorScreen.addButton('Back', () => {
                    historyBack();
                    //history.back();
                });
                errorScreen.show();
            }
        });
        //screen.addText('\n\n');
        screen.addButton('No profile?', async () => {
            await showSignupScreen();
        }, '2');
        await screen.show();
    };

    var signupData = {
        profileKey: null,
        id: null,
        password: null,
        name: null,
        image: null
    };
    var showSignupScreen = async (index, addToHistory) => {
        if (typeof index === 'undefined') {
            index = 1;
        }
        if (addToHistory === undefined) {
            addToHistory = true;
        }
        var showNextStep = async () => {
            await showSignupScreen(index + 1);
        }
        var screen = makeHomeScreen(addToHistory ? 'signup#' + index : null);
        screen.addBackButton();
        if (index === 1) {
            screen.addTitle('Great! Let\'s make\nyou a profile!');
            screen.addText("\nChoose a profile type:");

            screen.addButton('Private profile<span>Free. Following, groups, etc.</span>', async () => {
                var privateUsersIDs = await x.currentUser.getPrivateUsers();
                if (privateUsersIDs.length > 0) {
                    await showContinuePrivateUserScreen();
                } else {
                    await showNewPrivateUserScreen();
                }
            }, '3');

            screen.addButton('Public profile<span>Public posts, private messaging, etc.</span>', async () => {
                await showNextStep();
            }, '3');

        } else if (index === 2) {
            if (signupData.profileKey !== null) {
                screen.addTitle('Welcome! Let\'s make\nyou a profile!');
                screen.addText('\nThe key entered points to the hosting provider that will take care of your profile, and make sure it\'s online all the time.');
            } else {
                screen.addTitle('A new public profile' + "\n" + 'requires a key!');
                screen.addText('');
                //screen.addText('Do you have a profile key?');
                screen.addHint('These keys are provided by individuals and organizations, that will take care of hosting your profile, and make sure it\'s online all the time.');// <a>Learn more</a>.
                screen.addButton('Get one now', async () => {
                    window.open('https://hosting.dotsmesh.com/', '_blank');
                }, '2');
                screen.addText('\n\nAlready have a key?');
            }
            screen.addTextbox('profileKey', 'Profile key');
            screen.setValue('profileKey', signupData.profileKey);
            screen.addSubmitButton('Next', async () => {
                var profileKey = screen.getValue('profileKey').toLowerCase().trim();
                if (profileKey.length === 0) {
                    alert('The profile key cannot be empty!');
                    return;
                }
                var fullProfileKey = x.getPropertyFullKey(profileKey);
                var host = x.getPropertyKeyHost(fullProfileKey);
                if (host === null) {
                    alert('The profile key is not valid!');
                    return;
                }
                //Checking the code ...
                await showLoadingScreen();
                try {
                    var result = await x.host.call(host, 'host.validatePropertyKey', { key: fullProfileKey, context: 'user' });
                } catch (e) {
                    var result = null;
                }
                if (result === 'valid') {
                    signupData.profileKey = profileKey;
                    await showNextStep();
                } else if (result === 'invalid') {
                    var screen3 = makeHomeScreen('signup#error');
                    screen3.addTitle('Oops!');
                    screen3.addText('\nThe key provided is not valid!\n\n');
                    screen3.addButton('Try another one', () => {
                        historyBack();
                    });
                    await screen3.show();
                } else {
                    var screen3 = makeHomeScreen('signup#error');
                    screen3.addTitle('Oops!');
                    screen3.addText('\nThere was an error trying to check this key! Please try another one or try later.\n\n');
                    screen3.addButton('Back', () => {
                        historyBack();
                    });
                    await screen3.show();
                }
            });
        } else if (index === 3) {
            if (signupData.profileKey === null) {
                return false;
            }
            var fullProfileKey = x.getPropertyFullKey(signupData.profileKey);
            var host = x.getPropertyKeyHost(fullProfileKey);
            screen.addTitle('The profile key is valid!');
            screen.addText('\nNow it\'s time to choose an ID that will help everyone identify you. Only letters and numbers are allowed.');
            screen.addTextbox('id', 'ID');
            screen.setValue('id', signupData.id);
            var hostAlias = x.getHostAlias(host);
            if (hostAlias === '') {
                screen.addHint('The profile key entered, gives you the ability to select a premium ID (no additional symbols added).');
            } else if (hostAlias !== null) {
                screen.addHint('The profile key entered, gives you the ability to select a special ID that will end with ".' + hostAlias + '".');
            } else {
                screen.addHint('The key used is provided by ' + host + ', so this name will be appended to the ID selected.');
            }
            screen.addSubmitButton('Next', async () => {
                var id = screen.getValue('id').toLowerCase().trim();
                if (id.length === 0) {
                    alert('The ID is required!');
                    return;
                }
                if (id.match(/^[a-z0-9]+$/) === null) {
                    alert('The ID must contain only letters and numbers!');
                    return;
                }
                //Checking availability ...
                await showLoadingScreen();
                var idToCheck = id + '.' + host;
                try {
                    var result = await x.host.call(host, 'host.validatePropertyID', { id: idToCheck });//, context: 'user'
                } catch (e) {
                    //console.log(e);
                    var result = null;
                }
                if (result === 'valid') {
                    signupData.id = id;
                    await showNextStep();
                } else { // taken, invalid
                    var screen3 = makeHomeScreen('signup#error');
                    screen3.addTitle('Oops!');
                    if (result === 'taken') {
                        screen3.addText('\n' + x.getShortID(idToCheck) + ' is already taken!\n\n');
                        screen3.addButton('Choose another one', () => {
                            historyBack();
                            //history.back();
                        });
                    } else if (result === 'invalid') {
                        screen3.addText('\nThe ID choosen is invalid!\n\n');
                        screen3.addButton('Choose another one', () => {
                            historyBack();
                            //history.back();
                        });
                    } else {
                        screen3.addText('\nThere is a problem checking the ID! Please, try again later!\n\n');
                        screen3.addButton('Back', () => {
                            historyBack();
                            //history.back();
                        });
                    }
                    await screen3.show();
                }
            });
        } else if (index === 4) {
            if (signupData.id === null) {
                return false;
            }
            var fullProfileKey = x.getPropertyFullKey(signupData.profileKey);
            var host = x.getPropertyKeyHost(fullProfileKey);
            var fullID = signupData.id + '.' + host;
            screen.addTitle(x.getShortID(fullID) + "\n" + 'is available!');
            screen.addText('\nChoose a strong password');
            screen.addPassword('password', 'Password');
            screen.addPassword('password2', 'Repeat password');
            screen.setValue('password', signupData.password);
            screen.setValue('password2', signupData.password);
            screen.addHint('Your profile and your data are highly encrypted. The password is the only way to access them. Make sure it\'s a strong one and never share it with others.');// <a>Learn more</a>.
            screen.addSubmitButton('Next', async () => {
                var password = screen.getValue('password');
                var password2 = screen.getValue('password2');
                if (password.length === 0) {
                    alert('The password is required!');
                    return;
                }
                if (password.length < 6) {
                    alert('The password must be atleast 6 characters long!');
                    return;
                }
                if (password !== password2) {
                    alert('Passwords does not match!');
                    return;
                }
                signupData.password = password;
                await showNextStep();
            });
        } else if (index === 5) {
            if (signupData.password === null) {
                return false;
            }
            var image = signupData.image;
            screen.addTitle('\nSet up your profile now?');
            screen.addText('\nSelect an image and enter\na name for your public profile');
            var imageField = document.createElement('div');
            imageField.innerHTML = '<div class="x-home-screen-image-button" tabindex="0" aria-label="Profile image" role="button"></div><input type="file" accept="image/*" style="display:none;"></input>';
            screen.addHTML(imageField);
            var buttonElement = imageField.firstChild;
            var fileInput = imageField.lastChild;
            x.addClickToOpen(buttonElement, () => {
                fileInput.click();
            });
            fileInput.addEventListener('change', () => {
                if (fileInput.files.length > 0) {
                    var file = fileInput.files[0];
                    var reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = async () => {
                        image = reader.result;
                        buttonElement.style.backgroundImage = 'url(' + image + ')';
                    };
                    reader.onerror = e => {
                        // todo
                    };
                } else {
                    image = null;
                    //buttonElement.style.backgroundImage = '';
                    buttonElement.style.backgroundImage = 'url(' + x.getDefaultUserImage('todo') + ')';
                }
            });
            if (image !== null) {
                buttonElement.style.backgroundImage = 'url(' + image + ')';
            } else {
                buttonElement.style.backgroundImage = 'url(' + x.getDefaultUserImage('todo') + ')';
            }

            screen.addTextbox('name', 'Name');
            screen.setValue('name', signupData.name);
            screen.addHint('You can easily customize them later.');

            screen.addSubmitButton('Next', async () => {
                signupData.name = screen.getValue('name');
                signupData.image = image;
                await showNextStep();
            });
        } else if (index === 6) {
            if (signupData.name === null) {
                return false;
            }
            screen.addTitle('\nLooks good?');
            screen.addHint('<br>This is a preview of your profile.<br>You can customize it later.<br><br>');
            var imageElement = document.createElement('div');
            imageElement.innerHTML = '<div class="x-home-screen-image-preview"></div>';
            screen.addHTML(imageElement);
            imageElement.firstChild.style.backgroundImage = 'url(' + (signupData.image !== null ? signupData.image : x.getDefaultUserImage('todo')) + ')';

            var fullProfileKey = x.getPropertyFullKey(signupData.profileKey);
            var host = x.getPropertyKeyHost(fullProfileKey);
            var fullID = signupData.id + '.' + host;
            screen.addText((signupData.name === '' ? 'Unknown' : signupData.name), '1');
            screen.addText(x.getShortID(fullID) + "\n\n");
            screen.addButton('Yes, create my profile', async () => {
                //Creating your profile ...
                //This may take up to 20 seconds - your device is working on cryptography related stuff, that will make your profile more secure.
                await showLoadingScreen();
                var result = await x.currentUser.signup(signupData.profileKey, fullID, signupData.password);
                if (result === true) {
                    var result = await x.currentUser.login(fullID, signupData.password);
                    if (result === true) {
                        try {
                            await x.services.call('profile', 'setData', { propertyType: 'user', propertyID: fullID, data: { name: signupData.name, image: signupData.image } });
                        } catch (e) {
                            // ignore
                        }
                        signupData.profileKey = null;
                        signupData.id = null;
                        signupData.password = null;
                        signupData.name = null;
                        signupData.image = null;
                        var screen2 = makeHomeScreen();
                        screen2.addTitle('It\'s done!');
                        screen2.addText('\nYour profile is successfully created!\n\n');
                        screen2.addButton('Enter', async () => {
                            await showAppScreen(false);
                            await x.open('user/home', { userID: x.currentUser.getID() });
                        });
                        await screen2.show();
                    } else {
                        // todo login error
                    }
                } else {
                    // todo better error screen
                    var screen2 = makeHomeScreen();
                    screen2.addText('Cannot do that now!');
                    await screen2.show();
                }
            });
        }
        await screen.show();
        return true;
    };

    var showNewPrivateUserScreen = async addToHistory => {
        if (addToHistory === undefined) {
            addToHistory = true;
        }
        var screen = makeHomeScreen(addToHistory ? 'private#new' : null);
        screen.addBackButton();
        screen.addTitle('Let\'s make you\na private profile!');
        screen.addText('\nThis type of profile is free and lives on your device. It\'s perfect for following your friends and people you admire, and join groups to discuss and share.\n\n');
        screen.addButton('Activate', async () => {
            await showLoadingScreen();
            var userID = await x.currentUser.createPrivateUser();
            if (await x.currentUser.loginPrivateUser(userID)) {
                await showAppScreen(false);
                await x.open('user/home');
            } else {
                throw new Error();
            }
        });
        await screen.show();
    };

    var showContinuePrivateUserScreen = async addToHistory => {
        if (addToHistory === undefined) {
            addToHistory = true;
        }
        var screen = makeHomeScreen(addToHistory ? 'private#continue' : null);
        screen.addBackButton();
        screen.addTitle('Continue with the private profile that already exists on this device');
        screen.addText("\n");
        screen.addButton('Enter', async () => {
            await showLoadingScreen();
            var privateUsersIDs = await x.currentUser.getPrivateUsers();
            if (privateUsersIDs.length > 0) {
                if (await x.currentUser.loginPrivateUser(privateUsersIDs[0])) {
                    await showAppScreen(false);
                    await x.open('user/home');
                } else {
                    throw new Error();
                }
            }
        });
        await screen.show();
    };

    var lastAccessibleValue = true;
    var updateAppScreenAccessibility = accessible => {
        if (lastAccessibleValue !== accessible) {
            lastAccessibleValue = accessible;
            var elements = document.querySelectorAll('[tabindex]');
            for (var element of elements) {
                element.setAttribute('tabindex', accessible ? '0' : '-1');
            }
            document.querySelector('.x-app-toolbar-left').setAttribute('aria-hidden', accessible ? 'false' : 'true');
            document.querySelector('.x-app-toolbar-bottom').setAttribute('aria-hidden', accessible ? 'false' : 'true');
        }
    };

    var showAppScreen = async addToHistory => {
        if (addToHistory === undefined) {
            addToHistory = true;
        }
        if (addToHistory) {
            pushLocationState({
                type: 'app-screen'
            });
        }
        if (document.querySelector('.x-app-screen') !== null) {
            return;
        }
        var container = document.createElement('div');
        container.setAttribute('class', 'x-screen x-app-screen');
        container.innerHTML = '<div class="x-app-modals-background"><div></div></div>' +
            '<div class="x-app-toolbar-left"><div></div><div></div></div>' +
            '<div class="x-app-toolbar-bottom"></div>';
        // '<div class="x-app-menu-button"></div>' +
        // '<div class="x-app-menu"><div></div></div>';

        document.body.appendChild(container);
        var modalBackground = container.childNodes[0];
        modalBackground.addEventListener('click', closeLastLoadingModalWindow);
        var leftToolbarContainer = container.childNodes[1];
        var bottomToolbarContainer = container.childNodes[2];
        // var menuButton = container.childNodes[2];
        // var menuContainer = container.childNodes[3];

        // menuButton.addEventListener('click', async () => {
        //     if (x.currentUser.exists()) {
        //         if (menuContainer.getAttribute('x-visible')) {
        //             menuContainer.removeAttribute('x-visible');
        //         } else {
        //             menuContainer.setAttribute('x-visible', '1');
        //         }
        //         updateModalBackground();
        //     } else {
        //         await closeAllWindows();
        //         await showWelcomeScreen(true, { type: 'profile' });
        //     }
        // });

        // menuContainer.addEventListener('click', () => {
        //     menuContainer.removeAttribute('x-visible');
        //     updateModalBackground();
        // });

        // var button = document.createElement('a');
        // button.setAttribute('class', 'x-app-menu-close-button');
        // button.style.backgroundImage = 'url(\'' + x.getIconDataURI('close', '#999') + '\')';
        // menuContainer.firstChild.appendChild(button);

        for (var i = 0; i < 2; i++) {

            var leftMode = i === 0;

            var buttonsContainer = leftMode ? leftToolbarContainer.firstChild : bottomToolbarContainer;
            var userApps = leftMode ? ['home', 'explore', 'contacts', 'messages', 'groups', 'settings'] : ['home', 'explore'];

            var imageElement = document.createElement('span');
            imageElement.setAttribute('class', 'x-app-toolbar-user-image');
            var button = document.createElement('a');
            button.setAttribute('class', 'x-app-toolbar-button');
            button.setAttribute('tabindex', '0');
            button.setAttribute('role', 'button');
            button.appendChild(imageElement);
            buttonsContainer.appendChild(button);
            if (x.currentUser.exists()) {
                var clickData = {
                    location: 'user/home',
                    args: { userID: x.currentUser.getID() },
                    preload: true
                };
                button.setAttribute('title', 'My profile');
            } else {
                var clickData = async () => {
                    await closeAllWindows();
                    await showWelcomeScreen(true, { type: 'profile' });
                }
                button.setAttribute('title', 'Create your own profile');
            }
            x.addClickToOpen(button, clickData);

            if (x.currentUser.exists()) {
                userApps.forEach(appID => {
                    var button = document.createElement('a');
                    button.setAttribute('class', 'x-app-toolbar-button x-app-toolbar-button-app');
                    button.setAttribute('tabindex', '0');
                    button.setAttribute('role', 'button');
                    button.style.backgroundImage = 'url(\'' + x.getIconDataURI(appID === 'home' ? 'notification' : appID, leftMode ? '#999' : '#aaa') + '\')';
                    var app = x.getApp(appID);
                    button.setAttribute('title', app.name);
                    if (appID === 'home') {
                        button.setAttribute('x-home-app', '1');
                        button.setAttribute('aria-label', app.name);
                    }
                    buttonsContainer.appendChild(button);
                    x.addClickToOpen(button, {
                        location: appID + '/home',
                        preload: true
                    });
                });
                if (!leftMode) {
                    var button = document.createElement('a');
                    button.setAttribute('class', 'x-app-toolbar-button x-app-toolbar-button-app');
                    button.setAttribute('tabindex', '0');
                    button.setAttribute('role', 'button');
                    button.setAttribute('title', 'More');
                    button.style.backgroundImage = 'url(\'' + x.getIconDataURI('more', '#aaa') + '\')';
                    buttonsContainer.appendChild(button);
                    x.addClickToOpen(button, () => {
                        var apps = [
                            { id: 'contacts' },
                            { id: 'messages' },
                            { id: 'groups' },
                            { id: 'settings' }
                        ];
                        for (var i in apps) {
                            apps[i].name = x.getApp(apps[i].id).name;
                        }
                        x.open('user/menu', { apps: apps }, { modal: true, width: 300 });
                    });
                }
            }

            // if (leftMode) {
            //     var button = document.createElement('a');
            //     button.setAttribute('class', 'x-app-toolbar-button x-app-toolbar-button-app');
            //     button.style.backgroundImage = 'url(\'data:image/svg+xml;base64,' + btoa(x.logo) + '\')';
            //     toolbarContainer.firstChild.appendChild(button);
            //     x.addClickToOpen(button, () => {
            //         //x.open('user/homeNone');
            //         closeAllWindows();
            //         showWelcomeScreen();
            //     });
            // }

        }

        var updateAppToolbarUserImage = async () => {
            var userID = x.currentUser.getID();
            var details = await x.services.call('profile', 'getDetails', { propertyType: 'user', propertyID: userID, details: ['name'], imageSize: window.devicePixelRatio * 50 });
            var value = 'url(' + await x.image.getURL(details.image) + ')';
            var elements = document.querySelectorAll('.x-app-toolbar-user-image');
            elements.forEach(element => {
                element.style.backgroundImage = value;
            });
        };
        await updateAppToolbarUserImage();

        var updateAppToolbarNotificationsCount = async () => {
            if (!x.currentUser.exists()) {
                return;
            }
            var notifications = await x.notifications.getList();
            var count = 0;
            for (var notification of notifications) {
                if (notification.visible) {
                    count++;
                }
            }
            var elements = document.querySelectorAll('[x-home-app]');
            elements.forEach(element => {
                element.innerHTML = count > 0 ? ('<span>' + (count > 9 ? '9+' : count) + '</span>') : '';
            });
        };
        await updateAppToolbarNotificationsCount();



        // TODO MOVE

        x.coreEvents.addEventListener('announceChanges', async e => {
            var changes = e.detail.changes;
            var source = e.detail.source;
            // console.log(source);
            // console.log(changes);
            for (var windowID in windows) {
                var window = windows[windowID];
                if (window.exists) {
                    window.announcedChanges = window.announcedChanges.concat(changes);
                    if (source === 'worker') {
                        window.update(); // todo update only the visible one and maybe the previous one
                    } else {
                        // should update only the previous one (to be ready) and on prepareBack
                    }
                }
            }
            var currentUserID = x.currentUser.getID();
            for (var i = 0; i < changes.length; i++) {
                var change = changes[i];
                if (change.key === 'user/' + currentUserID + '/profile') {
                    updateAppToolbarUserImage();
                }
                if (change.key === 'notifications') {
                    updateAppToolbarNotificationsCount();
                }
            }
        });

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', e => {
                var data = e.data;
                if (typeof data.type !== 'undefined') {
                    if (data.type === 'notificationClick') {
                        x.notifications.onClick(data.data);
                    } else if (data.type === 'announceChanges') {
                        var changes = data.changes;
                        var event = new CustomEvent('announceChanges', {
                            detail: {
                                changes: changes,
                                source: 'worker'
                            }
                        });
                        x.coreEvents.dispatchEvent(event);
                    }
                }
            });
        }

        await hideVisibleScreen();
        container.setAttribute('x-visible', '1');
    };


    // APP STARTER

    x.startApp = async () => {
        await x.currentUser.autoLogin();
        await processLocationState();

        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('?app&sw');
            } catch (e) { }
        };
    };

    x.addCSS(css);

}