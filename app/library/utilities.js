/*
 * Dots Mesh Web App
 * https://github.com/dotsmesh/dotsmesh-web-app
 * Free to use under the GPL-3.0 license.
 */

(x) => {

    // Promise.allSettled polyfill
    if (Promise.allSettled === undefined) {
        Promise.allSettled = promises => {
            var mappedPromises = promises.map(promise => {
                return promise
                    .then(value => {
                        return {
                            status: 'fulfilled',
                            value: value
                        };
                    })
                    .catch(reason => {
                        return {
                            status: 'rejected',
                            reason: reason
                        };
                    });
            });
            return Promise.all(mappedPromises);
        };
    };

    // Test code for the Promise.allSettled polyfill

    // var p1 = new Promise((resolve, reject) => {
    //     resolve('value1');
    // });

    // var p2 = new Promise((resolve, reject) => {
    //     reject('error1');
    // });

    // Promise.allSettled([p1, p2]).then(values => {
    //     console.log(JSON.stringify(values));
    // });

    x.fontFamily = '-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Oxygen,Ubuntu,Cantarell,\'Open Sans\',\'Helvetica Neue\',sans-serif';

    /**
     * Supported formats:
     * Error object
     * Exception
     * App error
     * Name, messagess
     */
    x.makeAppError = (error, ...args) => {
        var result = {
            name: null,
            details: {},
            type: 'x-app-error'
        };
        if (typeof error === 'object' && error !== null) {
            if (error.error !== undefined && error.error !== null) {
                error = error.error;
            }
            if (error.reason !== undefined) {
                error = error.reason;
            }
            if (typeof error === 'object' && error !== null) {
                if (error.type !== undefined && error.type === 'x-app-error') { // its here because it might be in unhandledrejection's reason
                    return error;
                }
                if (error.name !== undefined) {
                    result.name = error.name;
                }
                if (error.message !== undefined) {
                    result.details.message = error.message;
                }
                if (error.stack !== undefined) {
                    result.details.stack = error.stack;
                }
            }
        } else if (typeof error === 'string') {
            result.name = error;
            if (args[0] !== undefined) {
                result.details.message = args[0];
            }
        }
        return result;
    };

    x.makeEventTarget = () => {
        if (EventTarget !== undefined && EventTarget.constructor !== undefined) {
            try {
                return new EventTarget();
            } catch (e) {

            }
        }
        // Needed for iOS
        var listeners = [];
        return {
            addEventListener: (type, callback) => {
                if (!(type in listeners)) {
                    listeners[type] = [];
                }
                listeners[type].push(callback);
            },
            removeEventListener: (type, callback) => {
                if (!(type in listeners)) {
                    return;
                }
                var stack = listeners[type];
                for (var i = 0, l = stack.length; i < l; i++) {
                    if (stack[i] === callback) {
                        stack.splice(i, 1);
                        return;
                    }
                }
            },
            dispatchEvent: (event) => {
                if (!(event.type in listeners)) {
                    return true;
                }
                var stack = listeners[event.type].slice();
                for (var i = 0, l = stack.length; i < l; i++) {
                    stack[i].call(this, event);
                }
                return !event.defaultPrevented;
            }
        }
    };

    // MESSAGING

    /**
     * Creates a messaging channel between targets.
     * Supported types: window-iframe (target is required), iframe-window, window-worker (target is required), worker-window
     */
    x.createMessagingChannel = (type, target) => {
        try {
            var listeners = [];
            var pending = [];
            var send = null;
            var destroy = null;

            var processMessage = message => {
                if (typeof message.type !== 'undefined') {
                    if (message.type === 'x-call') {
                        var action = message.action;
                        //console.log(message);
                        if (typeof listeners[action] !== 'undefined') {
                            (async () => {
                                try {
                                    var result = await listeners[action](message.args);
                                    send({ type: 'x-response', contextID: message.contextID, status: 'ok', result: result });
                                } catch (e) {
                                    var error = x.makeAppError(e);
                                    send({ type: 'x-response', contextID: message.contextID, status: 'error', error: JSON.stringify(error) });
                                }
                            })();
                        }
                    } else if (message.type === 'x-response') {
                        var contextID = message.contextID;
                        if (typeof pending[contextID] !== 'undefined') {
                            if (message.status === 'ok') {
                                pending[contextID][0](message.result);
                            } else if (message.status === 'error') {
                                var appError = JSON.parse(message.error);
                                pending[contextID][1](appError);
                            } else {
                                //todo
                            }
                            delete pending[contextID];
                        }
                    }
                }
            };
            if (type === 'window-iframe') {
                send = data => {
                    if (target.contentWindow !== null) { // may be closed
                        target.contentWindow.postMessage(data, '*');
                    }
                };
                var messageListener = e => {
                    if (e.source === target.contentWindow) {
                        processMessage(e.data);
                    }
                };
                addEventListener('message', messageListener);
                destroy = () => {
                    removeEventListener('message', messageListener);
                };
            } else if (type === 'iframe-window') {
                send = data => {
                    window.parent.postMessage(data, '*');
                };
                addEventListener('message', e => {
                    processMessage(e.data);
                });
            } else if (type === 'window-worker') {
                send = data => {
                    target.postMessage(data);
                };
                target.onmessage = e => {
                    processMessage(e.data);
                };
            } else if (type === 'worker-window') {
                send = data => {
                    self.postMessage(data);
                };
                self.onmessage = e => {
                    processMessage(e.data);
                };
            } else {
                throw new Error('Not supported');
            }

            return {
                addListener: (action, callback) => {
                    listeners[action] = callback;
                },
                send: (action, args) => {
                    return new Promise((resolve, reject) => {
                        var contextID = x.generateID();
                        pending[contextID] = [resolve, reject];
                        send({
                            type: 'x-call',
                            contextID: contextID,
                            action: action,
                            args: args
                        });
                    });
                },
                destroy: () => {
                    if (destroy !== null) {
                        destroy();
                    }
                }
            };
        } catch (e) {
            var error = x.makeAppError('messagingChannelError', e.message);
            error.details['createMessagingChannel'] = {
                type: type,
                target: target
            };
            throw error;
        }
    };


    // API PROXY

    {
        let proxyHandlers = [];

        x.addProxyCallHandler = handler => {
            proxyHandlers.push(handler);
        };

        x.processProxyCall = async (method, args, options) => {
            for (var i = 0; i < proxyHandlers.length; i++) {
                var proxyMethods = proxyHandlers[i](options);
                if (typeof proxyMethods[method] !== 'undefined') {
                    return await proxyMethods[method].apply(null, args);
                }
            }
            throw new Error('E1:' + method);
        };

        // x.addProxyCallHandler(options => {
        //     return {
        //         'admin.addInvitationCodes': x.admin.generateInvitationCodes,
        //         'admin.getPropertiesList': x.admin.getPropertiesList,
        //         'admin.getActiveInvitationCodes': x.admin.getActiveInvitationCodes,
        //     };
        // });
    }


    // DATA STORAGE

    x.dataStorage = {};
    x.dataStorage.get = (source, prefix = '') => {

        var execute = async commands => {
            return await source(commands);
        };

        var processCommand = async (buffer, command, callback) => {
            if (buffer !== null) {
                buffer.commands.push(command);
                var promiseCallbacks = null;
                var promise = new Promise((resolve, reject) => {
                    promiseCallbacks = [resolve, reject];
                });
                buffer.callbacks.push(async result => {
                    try {
                        if (typeof callback !== 'undefined') {
                            result = await callback(result);
                        }
                        promiseCallbacks[0](result);
                    } catch (e) {
                        promiseCallbacks[1](e);
                    }
                });
                return promise;
            } else {
                var result = await execute([command]);
                var result = result[0];
                if (typeof callback !== 'undefined') {
                    result = await callback(result);
                }
                return result;
            }
        };

        var set = async (key, value, buffer) => { // check types
            return await processCommand(buffer, {
                command: 'set',
                key: prefix + key,
                value: value,
            });
        };

        var append = async (key, value, buffer) => { // check types
            return await processCommand(buffer, {
                command: 'append',
                key: prefix + key,
                value: value,
            });
        };

        var get = async (key, buffer) => { // check types
            return await processCommand(buffer, {
                command: 'get',
                key: prefix + key
            });
        };

        var exists = async (key, buffer) => { // check types
            return await processCommand(buffer, {
                command: 'exists',
                key: prefix + key
            });
        };

        var delete_ = async (key, buffer) => { // check types
            return await processCommand(buffer, {
                command: 'delete',
                key: prefix + key
            });
        };

        var rename = async (sourceKey, targetKey, buffer) => { // check types
            return await processCommand(buffer, {
                command: 'rename',
                sourceKey: prefix + sourceKey,
                targetKey: prefix + targetKey,
            });
        };

        var duplicate = async (sourceKey, targetKey, buffer) => { // check types
            return await processCommand(buffer, {
                command: 'duplicate',
                sourceKey: prefix + sourceKey,
                targetKey: prefix + targetKey,
            });
        };

        var getList = async (options, buffer) => { // check types
            var options = typeof options === 'undefined' ? {} : x.shallowCopyObject(options);
            var prefixLength = prefix.length;
            if (prefixLength > 0) {
                options.keyStartWith = typeof options.keyStartWith !== 'undefined' ? prefix + options.keyStartWith : prefix;
                if (typeof options.keys !== 'undefined') {
                    options.keys.forEach((key, index) => {
                        options.keys[index] = prefix + key;
                    });
                }
            }
            return await processCommand(buffer, {
                command: 'getList',
                options: options
            }, result => {
                var temp = [];
                result.forEach(item => {
                    temp.push({
                        key: prefixLength > 0 ? item.key.substring(prefixLength) : item.key,
                        value: item.value
                    });
                });
                return temp;
            });
        };

        var dataStorage = null;

        var getBuffer = () => {
            var buffer = { commands: [], callbacks: [] };
            var flush = async () => {
                if (buffer.commands.length > 0) {
                    var rawResults = await execute(buffer.commands);
                    for (var i = 0; i < buffer.callbacks.length; i++) {
                        var callback = buffer.callbacks[i];
                        await callback(rawResults[i]);
                    }
                }
                buffer = { commands: [], callbacks: [] };
            };
            return {
                set: (key, value) => {
                    return set(key, value, buffer);
                },
                append: (key, value) => {
                    return append(key, value, buffer);
                },
                get: key => {
                    return get(key, buffer);
                },
                delete: key => {
                    return delete_(key, buffer);
                },
                exists: key => {
                    return exists(key, buffer);
                },
                rename: (sourceKey, targetKey) => {
                    return rename(sourceKey, targetKey, buffer);
                },
                duplicate: (sourceKey, targetKey) => {
                    return duplicate(sourceKey, targetKey, buffer);
                },
                getList: options => {
                    return getList(options, buffer);
                },
                flush: flush
            };
        };

        var getContext = prefix => {
            if (prefix === undefined) {
                throw new Error();
            }
            return x.dataStorage.get(async commands => {
                return await dataStorage.execute(commands);
            }, prefix);
        };

        var getDetailsContext = (prefix, cache = null) => {

            if (prefix === undefined) {
                throw new Error();
            }

            var getData = async key => {
                var dataKey = prefix + key;
                var data = null;
                if (cache !== null) {
                    data = await cache.get(dataKey);
                }
                if (data === null) {
                    var data = await dataStorage.get(dataKey);
                    if (data !== null) {
                        var data = await x.currentUser.decrypt(data);
                        var data = x.unpack(data);
                        if (data.name === '') {
                            data = data.value;
                        } else {
                            throw new Error();
                        }
                    } else {
                        var data = {};
                    }
                    if (cache !== null) {
                        await cache.set(dataKey, data);
                    }
                }
                return data;
            };

            var setDataInBuffer = async (buffer, key, data) => {
                var dataKey = prefix + key;
                if (JSON.stringify(data) === '{}') {
                    buffer.delete(dataKey);
                } else {
                    buffer.set(dataKey, await x.currentUser.encrypt(x.pack('', data)));
                }
                if (cache !== null) {
                    await cache.set(dataKey, data);
                }
            };

            var set = async (key, details) => {
                if (typeof details === 'undefined') {
                    details = {};
                }
                var mainData = await getData('m');
                var updateMain = false;
                if (typeof mainData[key] !== 'undefined') {
                    var index = mainData[key];
                } else {
                    var indexesCount = [];
                    for (var otherKey in mainData) {
                        var otherIndex = mainData[otherKey];
                        if (typeof indexesCount[otherIndex] === 'undefined') {
                            indexesCount[otherIndex] = 0;
                        }
                        indexesCount[otherIndex]++;
                    }
                    var index = null;
                    for (var i = 0; i < 1000000; i++) {
                        if (typeof indexesCount[i] === 'undefined' || indexesCount[i] < 100) {
                            index = i;
                            break;
                        }
                    }
                    if (index === null) {
                        throw new Error();
                    }
                    mainData[key] = index;
                    updateMain = true;
                }
                var detailsDataKey = index;
                var detailsData = await getData(detailsDataKey);
                if (typeof detailsData[key] === 'undefined') {
                    detailsData[key] = {};
                }
                for (var name in details) {
                    detailsData[key][name] = details[name];
                    if (details[name] === null) {
                        delete detailsData[key][name];
                    }
                }
                var buffer = dataStorage.getBuffer();
                await setDataInBuffer(buffer, detailsDataKey, detailsData);
                if (updateMain) {
                    await setDataInBuffer(buffer, 'm', mainData);
                }
                await buffer.flush();
            };

            var get = async (key, details) => {
                if (typeof details === 'undefined') {
                    details = [];
                }
                var mainData = await getData('m');
                if (typeof mainData[key] !== 'undefined') {
                    var index = mainData[key];
                    var detailsData = await getData(index);
                    var values = typeof detailsData[key] !== 'undefined' ? detailsData[key] : [];
                    if (details.length === 0) {
                        return values;
                    }
                    var result = {};
                    details.forEach(detail => {
                        result[detail] = typeof values[detail] !== 'undefined' ? values[detail] : null;
                    });
                    return result;
                }
                return null;
            };

            var exists = async key => {
                var mainData = await getData('m');
                return typeof mainData[key] !== 'undefined';
            };

            var delete_ = async key => {
                var mainData = await getData('m');
                if (typeof mainData[key] !== 'undefined') {
                    var index = mainData[key];
                    var detailsDataKey = index;
                    var detailsData = await getData(detailsDataKey);
                    var buffer = dataStorage.getBuffer();
                    if (typeof detailsData[key] !== 'undefined') {
                        delete detailsData[key];
                        await setDataInBuffer(buffer, detailsDataKey, detailsData);
                    }
                    delete mainData[key];
                    await setDataInBuffer(buffer, 'm', mainData);
                    await buffer.flush();
                }
            };

            var getList = async details => {
                if (typeof details === 'undefined') {
                    details = [];
                }
                var mainData = await getData('m');
                var result = {};
                var detailsData = [];
                for (var key in mainData) {
                    var index = mainData[key];
                    result[key] = {};
                    if (details.length > 0) {
                        if (typeof detailsData[index] === 'undefined') {
                            detailsData[index] = await getData(index);
                        }
                        var detailsValues = typeof detailsData[index][key] !== 'undefined' ? detailsData[index][key] : [];
                        details.forEach(detail => {
                            result[key][detail] = typeof detailsValues[detail] !== 'undefined' ? detailsValues[detail] : null;
                        });
                    }
                }
                return result;
            };

            return {
                set: set,
                get: get,
                exists: exists,
                delete: delete_,
                rename: rename,
                getList: getList
            };

        };

        var getOrderedListContext = prefix => {

            if (prefix === undefined) {
                throw new Error();
            }

            var set = async (key, value, options = {}) => {
                var buffer = typeof options.buffer !== 'undefined' ? options.buffer : null;
                var storage = buffer !== null ? buffer : dataStorage;
                var date = typeof options.date !== 'undefined' ? options.date : Date.now();
                storage.set(prefix + date + '-' + key, await x.currentUser.encrypt(x.pack('', value)));
            };

            var delete_ = async key => {
                var list = await dataStorage.getList({ keyStartWith: prefix, keySort: 'desc', sliceProperties: ['key'] });
                var buffer = dataStorage.getBuffer();
                for (var i = 0; i < list.length; i++) {
                    var item = list[i];
                    var itemKey = item.key.substring(item.key.indexOf('-', prefix.length) + 1);
                    if (itemKey === key) {
                        buffer.delete(item.key);
                    }
                }
                await buffer.flush();
            };

            var getList = async () => {
                var list = await dataStorage.getList({ keyStartWith: prefix, keySort: 'desc' });
                //console.table(list);
                var result = [];
                var alreadyAdded = [];
                var buffer = dataStorage.getBuffer();
                for (var i = 0; i < list.length; i++) {
                    var item = list[i];
                    var key = item.key.substring(item.key.indexOf('-', prefix.length) + 1);
                    if (alreadyAdded.indexOf(key) !== -1) {
                        buffer.delete(item.key);
                        continue;
                    }
                    var value = x.unpack(await x.currentUser.decrypt(item.value));
                    if (value.name === '') {
                        result.push({
                            key: key,
                            value: value.value
                        });
                        alreadyAdded.push(key);
                    } else {
                        throw new Error();
                    }
                }
                await buffer.flush();
                return result;
            };

            return {
                set: set,
                delete: delete_,
                getList: getList
            };

        };

        dataStorage = {
            set: (key, value) => {
                return set(key, value, null);
            },
            append: (key, value) => {
                return append(key, value, null);
            },
            get: key => {
                return get(key, null);
            },
            exists: key => {
                return exists(key, null);
            },
            delete: key => {
                return delete_(key, null);
            },
            rename: (sourceKey, targetKey) => {
                return rename(sourceKey, targetKey, null);
            },
            duplicate: (sourceKey, targetKey) => {
                return duplicate(sourceKey, targetKey, null);
            },
            getList: options => {
                return getList(options, null);
            },
            execute: async commands => {
                var commandsCount = commands.length;
                var buffer = dataStorage.getBuffer();
                var results = [];
                for (var i = 0; i < commandsCount; i++) {
                    var item = commands[i];
                    switch (item.command) {
                        case 'set':
                            results[i] = buffer.set(item.key, item.value);
                            break;
                        case 'append':
                            results[i] = buffer.append(item.key, item.value);
                            break;
                        case 'get':
                            results[i] = buffer.get(item.key);
                            break;
                        case 'exists':
                            results[i] = buffer.exists(item.key);
                            break;
                        case 'delete':
                            results[i] = buffer.delete(item.key);
                            break;
                        case 'rename':
                            results[i] = buffer.rename(item.sourceKey, item.targetKey);
                            break;
                        case 'duplicate':
                            results[i] = buffer.duplicate(item.sourceKey, item.targetKey);
                            break;
                        case 'getList':
                            results[i] = buffer.getList(item.options);
                            break;
                        default:
                            throw new Error();
                    }
                }
                await buffer.flush();
                for (var i = 0; i < commandsCount; i++) {
                    results[i] = await results[i];
                }
                return results;
            },
            getBuffer: getBuffer,
            getContext: getContext,
            getDetailsContext: getDetailsContext,
            getOrderedListContext: getOrderedListContext
        };

        // todo naming
        return dataStorage;
    };


    // FILES

    x.file = {};

    x.file.make = (dataURI, name, size) => {
        if (dataURI.substring(0, 5) !== 'data:') {
            throw new Error();
        }
        if (name === undefined) {
            name = '';
        }
        if (size === undefined) {
            size = dataURI.length;
        }
        return x.pack('f', [size, name, dataURI.substring(5)]);
    };

    x.file.getDetails = file => {
        var data = x.unpack(file);
        if (data.name === 'f') {
            return {
                name: data.value[1],
                size: data.value[0],
                value: 'data:' + data.value[2]
            };
        } else {
            throw new Error();
        }
    };

    // IMAGES

    x.image = {};

    x.image.make = async (dataURI, width, height, size) => {
        if (dataURI.substring(0, 5) !== 'data:') {
            throw new Error();
        }
        if (width === undefined || height === undefined || size === undefined) {
            var details = await x.image.getDetails(dataURI);
            width = details.width;
            height = details.height;
            size = details.size;
        }
        return 'i:w' + width + ':h' + height + ':s' + size + ':' + dataURI.substring(5);
    };

    x.image.getURL = async image => {
        var details = await x.image.getDetails(image);
        return details.value;
    };

    x.image.getDetails = async image => { // image or dataURI
        if (image.substr(0, 2) === 'i:') {
            var parts = image.split(':');
            var result = {
                width: null,
                height: null,
                size: null,
                value: null
            };
            for (var i = 1; i < parts.length - 1; i++) {
                var part = parts[i];
                var partName = part.substring(0, 1);
                var partValue = part.substring(1);
                if (partName === 'w') {
                    result.width = parseInt(partValue, 10);
                } else if (partName === 'h') {
                    result.height = parseInt(partValue, 10);
                } else if (partName === 's') {
                    result.size = parseInt(partValue, 10);
                }
            }
            result.value = 'data:' + parts[parts.length - 1];
            return result;
        } else if (image.substr(0, 5) === 'data:') {
            if (typeof createImageBitmap === "undefined") { // createImageBitmap is not supported on iOS
                var img = await x.loadImage(image);
                var width = img.width;
                var height = img.height;
            } else {
                var imageBitmap = await createImageBitmap(await (await fetch(image)).blob());
                var width = imageBitmap.width;
                var height = imageBitmap.height;
            }
            return {
                width: width,
                height: height,
                size: image.length,
                value: image
            };
        } else {
            throw new Error();
        }
    };

    x.image.resize_ = async (image, width, height, quality) => {
        if (typeof width === 'undefined') {
            width = null;
        }
        if (typeof height === 'undefined') {
            height = null;
        }
        if (typeof quality === 'undefined') {
            quality = 100;
        }
        var details = await x.image.getDetails(image);
        var imageWidth = details.width;
        var imageHeight = details.height;
        if (width === null && height === null) {
            width = imageWidth;
            height = imageHeight;
        } else if (width === null) {
            width = Math.floor(height / imageHeight * imageWidth);
        } else if (height === null) {
            height = Math.floor(width / imageWidth * imageHeight);
        }
        if (width < 1) {
            width = 1;
        }
        if (height < 1) {
            height = 1;
        }
        if (typeof document !== 'undefined') {
            var canvas = document.createElement('canvas');
        } else {
            throw new Error('Cannot resize image');
        }
        var ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        var widthRatio = width / imageWidth;
        var heightRatio = height / imageHeight;
        var ratio = Math.max(widthRatio, heightRatio);
        var destinationX = (width - imageWidth * ratio) / 2;
        var destinationY = (height - imageHeight * ratio) / 2;
        if (typeof createImageBitmap === "undefined") { // createImageBitmap is not supported on iOS
            var imageToDraw = await x.loadImage(details.value);
        } else {
            var imageToDraw = await createImageBitmap(await (await fetch(details.value)).blob());
        }
        ctx.drawImage(imageToDraw, 0, 0, imageWidth, imageHeight, destinationX, destinationY, imageWidth * ratio, imageHeight * ratio);
        var result1 = ctx.canvas.toDataURL('image/png', quality / 100);
        var result2 = ctx.canvas.toDataURL('image/jpeg', quality / 100);
        var value = result1.length < result2.length ? result1 : result2;
        return await x.image.make(value, width, height, value.length);
    };

    x.image.cropCircle = async image => {
        var details = await x.image.getDetails(image);
        if (typeof document !== 'undefined') {
            var canvas = document.createElement('canvas');
        } else {
            throw new Error('Cannot resize image');
        }
        var ctx = canvas.getContext("2d");
        var width = canvas.width = details.width;
        var height = canvas.height = details.height;
        var value = details.value;
        if (value.indexOf('data:image/svg+xml;') === 0) {
            var p = new Promise(resolve => {
                var img = document.createElement('img');
                img.src = value;
                img.onload = () => {
                    resolve(img);
                };
            });
            ctx.drawImage(await p, 0, 0);
        } else {
            if (typeof createImageBitmap === "undefined") { // createImageBitmap is not supported on iOS
                var imageToDraw = await x.loadImage(value);
            } else {
                var imageToDraw = await createImageBitmap(await (await fetch(value)).blob());
            }
            ctx.drawImage(imageToDraw, 0, 0);
        }
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, height / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        var value = ctx.canvas.toDataURL('image/png', 1);
        return await x.image.make(value, width, height, value.length);
    };


    // DATES

    x.getDateID = (milliseconds, precision) => { // 0 - milliseconds, 1 - seconds, 2 - days
        if (typeof precision === 'undefined') {
            precision = 0;
        }
        if (precision === 0) {
            return milliseconds.toString(36).padStart(9, '0'); // max Apr 22 5188
        } else if (precision === 1) {
            return Math.floor(milliseconds / 1000).toString(36).padStart(7, '0'); // max Apr 05 4453
        } else if (precision === 2) {
            return Math.floor(milliseconds / 1000 / 86400).toString(36).padStart(4, '0'); // max Aug 18 6568
        }
        throw new Error();
    };

    x.parseDateID = dateID => {
        var length = dateID.length;
        if (length === 9) {
            return parseInt(dateID, 36);
        } else if (length === 7) {
            return parseInt(dateID, 36) * 1000;
        } else if (length === 4) {
            return parseInt(dateID, 36) * 1000 * 86400;
        }
        throw new Error();
    }

    // console.log(x.getDateID(Date.now()));
    // console.log(x.getDateID(Date.now(), 1));
    // console.log(x.getDateID(Date.now(), 2));

    // console.log(x.parseDateID(x.getDateID(Date.now())));
    // console.log(x.parseDateID(x.getDateID(Date.now(), 1)));
    // console.log(x.parseDateID(x.getDateID(Date.now(), 2)));

    // console.log(x.getDateID(x.parseDateID(x.getDateID(Date.now()))));
    // console.log(x.getDateID(x.parseDateID(x.getDateID(Date.now(), 1)), 1));
    // console.log(x.getDateID(x.parseDateID(x.getDateID(Date.now(), 2)), 2));


    // GENERATORS

    {
        let idCounter = 0;

        x.generateID = () => {
            idCounter++;
            return x.generateRandomString(3) + idCounter.toString(36) + Date.now().toString(36).padStart(9, '0');
        };

        x.generateDateBasedID = () => { // fixed length 16, must be the same on the server
            idCounter++;
            var temp = idCounter.toString(36);
            var suffix = temp + x.generateRandomString(7 - temp.length);
            return x.getDateID(Date.now()).padStart(9, '0') + suffix;
        };

        x.generateVersion = () => {
            return x.generateRandomString(5, true) + Date.now().toString(36);
        };

        x.generateRandomString = (length, allowUpperCase) => {
            if (typeof length === 'undefined') {
                length = 100;
            }
            if (typeof allowUpperCase === 'undefined') {
                allowUpperCase = false;
            }
            var chars = ('qwertyuiopasdfghjklzxcvbnm0123456789' + (allowUpperCase ? 'QWERTYUIOPASDFGHJKLZXCVBNM' : '')).split('');
            var result = '';
            for (var i = 0; i < length; i++) {
                result += chars[Math.floor(Math.random() * chars.length)];
            }
            return result;
        };

        x.generateOtherUniqueID = (takenIDs, minLength) => {
            if (typeof minLength === 'undefined' || minLength < 1) {
                minLength = 1;
            }
            for (var idLength = minLength; idLength < minLength + 100; idLength++) {
                for (var i = 0; i < 36 * minLength; i++) {
                    var id = x.generateRandomString(idLength);
                    if (takenIDs.indexOf(id) === -1) {
                        return id;
                    }
                }
            }
            throw new Error('generateOtherID failed!');
        };
    }


    // ARRAY UTILITIES

    x.shallowCopyObject = object => {
        return Object.assign({}, object);
    };

    x.deepCopyObject = object => {
        var result = Object.assign({}, object);
        for (var property in result) {
            if (result[property] !== null && typeof result[property] === 'object') {
                result[property] = x.deepCopyObject(result[property]);
            }
        };
        return result;
    };

    x.sortObjectKeyAsc = object => {
        var result = {};
        Object.keys(object).sort().forEach(key => {
            result[key] = object[key];
        });
        return result;
    };

    x.sortObjectKeyDesc = object => {
        var result = {};
        Object.keys(object).sort().reverse().forEach(key => {
            result[key] = object[key];
        });
        return result;
    };

    x.sortObjectValueAsc = object => {
        var sortedKeys = Object.keys(object).sort((a, b) => { return object[a] - object[b] });
        var result = {};
        sortedKeys.forEach(key => {
            result[key] = object[key];
        });
        return result;
    };

    x.sortObjectValueDesc = object => {
        var sortedKeys = Object.keys(object).sort((a, b) => { return object[b] - object[a] });
        var result = {};
        sortedKeys.forEach(key => {
            result[key] = object[key];
        });
        return result;
    };

    x.shallowCopyArray = array => {
        return array.slice(0);
    };

    x.isEmptyObject = value => {
        return Object.keys(value).length === 0 && value.constructor === Object;
    };

    x.findInObject = (object, value) => {
        var result = Object.keys(object).find(key => object[key] === value);
        return result !== undefined ? result : null;
    };

    x.isSameContent = (item1, item2) => {
        return JSON.stringify(item1) === JSON.stringify(item2);
    };

    x.arrayUnique = array => {
        return array.filter((v, i, a) => { return a.indexOf(v) === i });
    };

    x.arrayIntersect = (array1, array2) => {
        return array1.filter(value => array2.indexOf(value) !== -1);
    };

    /**
     * Returns all values from array1 that are not in array2
     */
    x.arrayDifference = (array1, array2) => {
        return array1.filter(value => array2.indexOf(value) === -1);
    };

    x.removeFromArray = (array, valueToRemove) => {
        return array.filter((v) => { return valueToRemove !== v });
    };


    // ATTACHMENTS

    x.attachment = {};

    x.attachment.make = () => {
        var attachment = {};
        attachment.id = null;
        attachment.type = null;
        attachment.value = null;
        attachment.getResource = null;
        attachment.pack = async () => {
            if (attachment.type === null) {
                throw new Error('The attachment type should not be empty!');
            }
            if (attachment.value === null) {
                throw new Error('The attachment value should not be empty!');
            }
            var hasResource = false;
            var resourceToSave = null;
            var type = attachment.type;
            var value = attachment.value;
            if (type === 'i') { // image
                var image = await x.image.getDetails(value);
                value = await x.image.make('data:r', image.width, image.height, image.size);
                if (image.value !== 'data:r') {
                    resourceToSave = image.value;
                }
                hasResource = true;
            } else if (type === 'f') { // file
                var file = await x.file.getDetails(value);
                value = await x.file.make('data:r', file.name, file.size);
                if (file.value !== 'data:r') {
                    resourceToSave = file.value;
                }
                hasResource = true;
            }
            return {
                value: x.pack('', [type, value]),
                hasResource: hasResource,
                resourceToSave: resourceToSave
            };
        };
        attachment.clone = async () => {
            var result = x.attachment.make();
            result.id = attachment.id;
            result.type = attachment.type;
            result.value = attachment.value;
            return result;
        };
        return attachment;
    };

    x.attachment.unpack = (id, value, getResourceFunction) => {
        var attachment = x.attachment.make();
        attachment.id = id;
        var data = x.unpack(value);
        if (data.name === '') {
            attachment.type = data.value[0];
            attachment.value = data.value[1];
        } else {
            throw new Error();
        }
        attachment.getResource = async () => {
            return await getResourceFunction(attachment);
        };
        return attachment;
    };


    // IDS

    x.parseID = id => {
        id = id.trim().toLowerCase();
        var index = id.indexOf('.');
        if (index !== -1) {
            var key = id.substr(0, index);
            var host = id.substr(index + 1);
        } else {
            return null;
        }
        if (host.match(/^[a-z0-9\.\-]+$/) === null) {
            return null;
        }
        if (key.match(/^[a-z0-9]+$/) === null) {
            return null;
        }
        return {
            host: host,
            key: key
        };
    };

    x.isPublicID = id => {
        if (id === null) {
            return false;
        }
        return id.substr(0, 1) !== '-' && x.parseID(id) !== null;
    };

    x.isPrivateID = id => {
        if (id === null) {
            return false;
        }
        return id.substr(0, 1) === '-';
    };

    x.getFullID = id => {
        if (id !== '') {
            var parts = id.split('.');
            if (parts.length === 1) {
                var host = x.getAliasHost('');
                if (host !== null) {
                    return id + '.' + host;
                }
            }
            if (parts.length === 2) {
                var host = x.getAliasHost(parts[1]);
                if (host !== null) {
                    return parts[0] + '.' + host;
                }
            }
        }
        return id;
    };

    x.getShortID = id => {
        var data = x.parseID(id);
        if (data === null) {
            return null;
        }
        var alias = x.getHostAlias(data.host);
        return data.key + (alias !== null ? (alias === '' ? '' : '.' + alias) : '.' + data.host);
    };

    var suffixes = ["af", "ax", "al", "dz", "as", "ad", "ao", "ai", "aq", "ag", "ar", "am", "aw", "au", "at", "az", "bs", "bh", "bd", "bb", "by", "be", "bz", "bj", "bm", "bt", "bo", "bq", "ba", "bw", "bv", "br", "io", "bn", "bg", "bf", "bi", "kh", "cm", "ca", "cv", "ky", "cf", "td", "cl", "cn", "cx", "cc", "co", "km", "cg", "ck", "cr", "ci", "hr", "cu", "cw", "cy", "cz", "cd", "dk", "dj", "dm", "do", "ec", "eg", "sv", "gq", "er", "ee", "et", "fk", "fo", "fj", "fi", "fr", "gf", "pf", "tf", "ga", "gm", "ge", "de", "gh", "gi", "gr", "gl", "gd", "gp", "gu", "gt", "gg", "gn", "gw", "gy", "ht", "hm", "hn", "hk", "hu", "is", "in", "id", "ir", "iq", "ie", "im", "il", "it", "jm", "jp", "je", "jo", "kz", "ke", "ki", "kw", "kg", "la", "lv", "lb", "ls", "lr", "ly", "li", "lt", "lu", "mo", "mg", "mw", "my", "mv", "ml", "mt", "mh", "mq", "mr", "mu", "yt", "mx", "fm", "md", "mc", "mn", "me", "ms", "ma", "mz", "mm", "na", "nr", "np", "nl", "nc", "nz", "ni", "ne", "ng", "nu", "nf", "kp", "mk", "mp", "no", "om", "pk", "pw", "ps", "pa", "pg", "py", "pe", "ph", "pn", "pl", "pt", "pr", "qa", "ro", "ru", "rw", "re", "bl", "sh", "kn", "lc", "mf", "pm", "vc", "ws", "sm", "st", "sa", "sn", "rs", "sc", "sl", "sg", "sx", "sk", "si", "sb", "so", "za", "gs", "kr", "ss", "es", "lk", "sd", "sr", "sj", "sz", "se", "ch", "sy", "tw", "tj", "tz", "th", "tl", "tg", "tk", "to", "tt", "tn", "tr", "tm", "tc", "tv", "ug", "ua", "ae", "gb", "um", "us", "uy", "uz", "vu", "va", "ve", "vn", "vg", "vi", "wf", "eh", "ye", "zm", "zw"];

    x.getHostAlias = host => {
        if (host === 'x.dotsmesh.com') {
            return '';
        }
        var matches = host.match(/x(.*?).dotsmesh.com/);
        if (matches !== null && suffixes.indexOf(matches[1]) !== -1) {
            return matches[1];
        }
        return null;
    };

    x.getAliasHost = alias => {
        if (alias === '') {
            return 'x.dotsmesh.com';
        } else if (suffixes.indexOf(alias) !== -1) {
            return 'x' + alias + '.dotsmesh.com';
        }
        return null;
    };

    x.getTypedID = (type, id) => {
        if (type === 'user') {
            return id;
        } else if (type === 'group') {
            return 'g:' + id;
        }
        throw new Error();
    };

    x.parseTypedID = typedID => {
        var parts = typedID.split(':');
        if (parts.length === 1) {
            return {
                type: 'user',
                id: typedID
            }
        } else {
            var prefix = parts[0];
            if (prefix === 'g') {
                return {
                    type: 'group',
                    id: parts[1]
                }
            }
        }
        throw new Error();
    };


    // ICONS

    x.icons = {
        'back': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.476 18.962L8.513 12l6.962-6.962" stroke-width="2.321"/></svg>',
        'close': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.406 4.406l15.188 15.188m-15.188 0L19.594 4.406" stroke-width="2.683"/></svg>',
        'delete': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.152 4.695h-14m9-1h-4m-4 5v10c0 .67.33 1 1 1h10c.67 0 1-.33 1-1v-10"/></svg>',
        'edit': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.312 4.497l1.2 1.2a2 2 0 0 1 0 2.82l-11.6 11.57h-4v-4l11.6-11.6a2 2 0 0 1 2.82 0zm-4.4 1.6l4 4"/></svg>',
        'more': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 11c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM6 11c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg>',
        'plus': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.725 12H4.274M12 4.274v15.45" stroke-width="2.704"/></svg>',
        'attachment': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 18 18" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6.243 10.335l5.01-5.018a1.563 1.563 0 0 1 2.207 2.214l-6.898 6.802a2.602 2.602 0 1 1-3.678-3.678l6.823-6.73a3.644 3.644 0 1 1 5.157 5.15l-4.942 4.942" stroke-width="1.042"/></svg>',
        'messages': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.118 18.74l-4.378 2.2.593-4.15c-1.495-1.295-2.408-3.024-2.408-4.925 0-4 4.063-7.26 9.076-7.26s9.076 3.25 9.076 7.26-4.063 7.26-9.076 7.26a11.208 11.208 0 0 1-2.882-.374z" stroke-width="1.915"/></svg>',
        'contacts': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 23.999 24" fill="none" stroke="#fff" stroke-width="2.397" stroke-linecap="round" stroke-linejoin="round"><path d="M8.044 3.092V20.9m11.878-17.82V20.9H6.058a1.986 1.986 0 0 1-1.98-1.98V5.082a1.986 1.986 0 0 1 1.98-1.98zM8.044 16.956c0-1.98 3.303-1.65 4.623-2.968.66-.663-1.328-.663-1.328-3.96 0-2.198.9-3.303 2.644-3.303 1.763 0 2.644 1.09 2.644 3.303 0 3.303-1.98 3.303-1.328 3.96 1.32 1.317 4.614.982 4.614 2.968" stroke-width="1.98"/></svg>',
        'contacts-clock': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" stroke="#fff" stroke-width="1.951" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M7.98 3.162v17.56"/><path d="M19.687 9.943V20.73H6.028c-1.077508 0-1.95-.873492-1.95-1.95V5.113c0-1.077508.873493-1.95 1.95-1.95h7.805M7.987 16.82c0-1.952 3.252-1.627 4.553-2.927.662-.662-1.3-.662-1.3-3.904 0-2.168.878-3.252 2.603-3.252S16.436 7.8 16.436 9.99c0 3.252-1.952 3.252-1.3 3.904 1.3 1.3 4.552.975 4.552 2.927"/><circle cx="19.474577" cy="3.661018" r="2.898305" fill="#fff" stroke="none"/></svg>',
        'contacts-tick': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" stroke="#fff" stroke-width="1.951" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M7.98 3.162v17.56"/><path d="M19.687 11.943v8.788H6.028a1.951 1.951 0 0 1-1.951-1.951V5.113a1.951 1.951 0 0 1 1.951-1.951h7.805M7.987 16.82c0-1.952 3.252-1.627 4.553-2.927.662-.662-1.31-.662-1.31-3.904 0-2.168.878-3.252 2.603-3.252s2.603 1.073 2.603 3.252c0 3.252-1.952 3.252-1.31 3.904 1.3 1.31 4.552.975 4.552 2.927M16.707 5.113L18.395 6.8l3.71-3.71"/></svg>',
        'contacts-plus': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24.001 24" fill="none" stroke="#fff" stroke-width="1.964" stroke-linecap="round" stroke-linejoin="round"><path d="M7.837 3.152v17.67m11.78-8.834v8.845H5.874A1.962 1.962 0 0 1 3.91 18.87V5.115a1.962 1.962 0 0 1 1.964-1.962h7.854m-5.89 13.744c0-1.962 3.273-1.645 4.583-2.946.655-.655-1.31-.655-1.31-3.927 0-2.18.885-3.273 2.618-3.273s2.61 1.09 2.61 3.274c0 3.273-1.962 3.273-1.31 3.927 1.316 1.31 4.58.982 4.58 2.946m2.907-11.783h-5.89"/><path d="M19.572 2.16v5.893"/></svg>',
        'explore': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.889" stroke-linecap="round" stroke-linejoin="round"><path d="M14.002 14.002l-6.678 2.673 2.673-6.678 6.678-2.673z"/><circle cx="12" cy="12" r="9.445"/></svg>',
        'groups': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 17.993c0-2.25 3-2.25 4.5-3.75.75-.75-1.5-.75-1.5-4.5 0-2.5 1-3.75 3-3.75s3 1.25 3 3.75c0 3.75-2.25 3.75-1.5 4.5 1.5 1.5 4.5 1.5 4.5 3.75m-.2-2.27l1.2-.5c.55-.26 1.08-.56 1.5-.98.75-.75-1.5-.75-1.5-4.5 0-2.5 1-3.75 3-3.75s3 1.25 3 3.75c0 3.75-2.25 3.75-1.5 4.5 1.5 1.5 4.5 1.5 4.5 3.75m-11-2l.8-.27"/></svg>',
        'group-plus': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" stroke="#fff" stroke-width="1.972" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M6.137 18.08c0-2.218 2.958-2.218 4.437-3.697.74-.74-1.48-.74-1.48-4.437 0-2.465.985-3.697 2.958-3.697S15 7.482 15 9.947c0 3.697-2.218 3.697-1.48 4.437 1.48 1.48 4.437 1.48 4.437 3.697M22.7 5.616h-5.915"/><path d="M19.743 2.667v5.916"/></svg>',
        'settings': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.045 12.7a7.08 7.08 0 0 1 0-1.4l-1.84-2.08 2-3.46 2.7.55a7 7 0 0 1 1.22-.7l.88-2.6h4l.87 2.6a7 7 0 0 1 1.22.71l2.7-.55 2 3.46-1.83 2.06a7.08 7.08 0 0 1 0 1.42l1.83 2.06-2 3.46-2.7-.55a7 7 0 0 1-1.22.7l-.87 2.63h-4l-.87-2.6a7 7 0 0 1-1.22-.71l-2.7.55-2-3.46 1.83-2.06z"/><circle cx="12" cy="12" r="1"/></svg>',
        'share': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.13" stroke-linecap="round" stroke-linejoin="round"><path d="M15.46 7.397l-6.698 3.65zm.077 9.395l-6.9-3.617z"/><circle r="2.13" cy="12" cx="6.676"/><circle r="2.13" cy="6.143" cx="17.324"/><circle r="2.13" cy="17.857" cx="17.324"/></svg>',
        'notification': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.257" stroke-linecap="round" stroke-linejoin="round"><path d="M19.092 9.985v5.642c0 2.257.753 3.76 2.257 4.514H3.294c1.504-.753 2.257-2.257 2.257-4.514V9.985c0-3.74 3.03-6.77 6.77-6.77h0a6.77 6.77 0 0 1 6.771 6.771z"/><path d="M10.065 20.14a2.26 2.26 0 0 0 2.257 2.257 2.26 2.26 0 0 0 2.257-2.257"/></svg>',
        'notification-tick': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="2.249"><path d="M18.986 10.05v5.62c0 2.25.75 3.747 2.25 4.497h-18c1.5-.75 2.25-2.25 2.25-4.497v-5.62a6.75 6.75 0 0 1 6.746-6.746h0c1.79 0 3.505.71 4.77 1.976s1.976 2.98 1.976 4.77z"/><path d="M9.992 20.17a2.25 2.25 0 0 0 3.387 1.987 2.25 2.25 0 0 0 1.11-1.987"/></g><path d="M8.986 12.6l2.114 2.114 4.648-4.648" fill="#fff" stroke-width="2.247"/></svg>',
        'lock': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11h14v10H5z"/><path d="M12 3h0a5 5 0 0 1 5 5v3H7V8a5 5 0 0 1 5-5z"/><circle r="1" cy="16" cx="12"/></svg>',
        'checkbox': '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M4 13l5 5L20 7"/></svg>',
        'rich-editor-bold': '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" fill="#fff"><path d="M353.94 242.33C372.7 220.05 384 191.33 384 160c0-70.58-57.42-128-128-128H96v448h192c70.58 0 128-57.42 128-128 0-46.48-24.9-87.25-62.06-109.67zM192 96h50.75c27.98 0 50.75 28.7 50.75 64s-22.77 64-50.75 64H192V96zm79.5 320H192V288h79.5c29.23 0 53 28.7 53 64s-23.77 64-53 64z"/></svg>',
        'rich-editor-italic': '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" fill="#fff"><path d="M448 32v32h-64L224 448h64v32H64v-32h64L288 64h-64V32z"/></svg>',
        'rich-editor-strikethrough': '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" fill="#fff"><path d="M512 256v32H394.75C408.5 307.25 416 329.35 416 352c0 35.44-18.33 69.5-50.3 93.48C336.04 467.74 297.08 480 256 480c-41.07 0-80.03-12.26-109.7-34.52C114.32 421.5 96 387.44 96 352h64c0 34.7 43.96 64 96 64s96-29.3 96-64-43.96-64-96-64H0v-32h149.76l-3.47-2.52C114.3 229.5 96 195.44 96 160s18.33-69.5 50.3-93.48C175.96 44.26 214.92 32 256 32c41.07 0 80.03 12.26 109.7 34.52C397.68 90.5 416 124.56 416 160h-64c0-34.7-43.96-64-96-64s-96 29.3-96 64 43.96 64 96 64c39.5 0 77.03 11.34 106.24 32H512z"/></svg>',
        'rich-editor-orderedlist': '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" fill="#fff"><path d="M192 416h320v64H192zm0-192h320v64H192zm0-192h320v64H192zM96 0v128H64V32H32V0zM64 263v25h64v32H32v-73l64-30v-25H32v-32h96v73zm64 89v160H32v-32h64v-32H32v-32h64v-32H32v-32z"/></svg>',
        'rich-editor-unorderedlist': '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" fill="#fff"><path d="M192 32h320v64H192V32zm0 192h320v64H192v-64zm0 192h320v64H192v-64zM0 64a64 64 2160 1 0 128 0A64 64 2160 1 0 0 64zm0 192a64 64 2160 1 0 128 0 64 64 2160 1 0-128 0zm0 192a64 64 2160 1 0 128 0 64 64 2160 1 0-128 0z"/></svg>',
        'rich-editor-link': '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" fill="#fff"><path d="M160 352c8.8 8.8 23.64 8.36 32.97-.97l158.06-158.06c9.33-9.33 9.77-24.17.97-32.97s-23.64-8.36-32.97.97L160.97 319.03c-9.33 9.33-9.77 24.17-.97 32.97zm78.44-14.44c2.28 4.52 3.5 9.58 3.5 14.84 0 8.8-3.37 17.03-9.5 23.16l-81.7 81.7c-6.1 6.1-14.34 9.5-23.14 9.5s-17.03-3.4-23.16-9.5l-49.7-49.7c-6.1-6.13-9.48-14.35-9.48-23.16s3.37-17.03 9.5-23.15l81.68-81.7c6.13-6.12 14.35-9.5 23.16-9.5 5.27 0 10.32 1.23 14.85 3.5l32.67-32.66c-13.94-10.72-30.72-16.1-47.52-16.1-20 0-40 7.6-55.16 22.76l-81.7 81.7c-30.32 30.33-30.32 79.96 0 110.3l49.7 49.7C87.6 504.4 107.6 512 127.6 512s39.98-7.58 55.15-22.75l81.7-81.7c27.9-27.9 30.1-72.14 6.66-102.66l-32.66 32.66zm250.8-265.12l-49.68-49.7C424.4 7.6 404.4 0 384.4 0s-39.98 7.58-55.15 22.75l-81.7 81.7c-27.9 27.9-30.1 72.14-6.66 102.66l32.66-32.66c-2.28-4.52-3.5-9.58-3.5-14.84 0-8.8 3.37-17.03 9.5-23.16l81.7-81.7c6.1-6.1 14.34-9.5 23.14-9.5s17.03 3.4 23.16 9.5l49.7 49.7c6.1 6.13 9.5 14.35 9.5 23.16s-3.4 17.03-9.5 23.15l-81.7 81.7c-6.13 6.1-14.35 9.5-23.16 9.5-5.26 0-10.32-1.23-14.84-3.5L304.9 271.1c13.92 10.72 30.7 16.1 47.5 16.1 20 0 40-7.6 55.16-22.76l81.7-81.7c30.32-30.32 30.32-79.96 0-110.3z"/></svg>'
    };

    x.getIconDataURI = (name, color) => {
        var result = x.icons[name];
        if (color !== undefined) {
            result = x.stringReplaceAll(result, '#fff', color);
        }
        return 'data:image/svg+xml;base64,' + btoa(result);
    };

    x.getDefaultUserImage = (id, size) => {
        // todo minify
        var value = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="#fff" stroke-width="1" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" color="#fff"><rect width="100%" height="100%" fill="#24a4f2" stroke-width="0" /><title>Person</title><path fill="none" d="M6.53 17.47c0-2.05 2.73-2.05 4.1-3.42.7-.68-1.37-.68-1.37-4.1 0-2.28.92-3.42 2.74-3.42 1.82 0 2.74 1.14 2.74 3.42 0 3.42-2.06 3.42-1.37 4.1 1.37 1.37 4.1 1.37 4.1 3.42"/></svg>';
        if (id === null) {
            value = x.stringReplaceAll(value, '#fff', '#aaa');
            value = x.stringReplaceAll(value, '#24a4f2', '#555');
        }
        return 'data:image/svg+xml;base64,' + btoa(value);
    };

    x.getDefaultGroupImage = () => {
        // todo minify
        var value = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M0 0h24v24H0z" fill="#24a4f2" stroke="none"/><g stroke-width="1.428"><circle cx="7.716" cy="7.716" r=".714"/><circle cx="12" cy="7.716" r=".714"/><circle cx="16.284" cy="7.716" r=".714"/><circle cx="7.716" cy="12" r=".714"/><circle cx="12" cy="12" r=".714"/><circle cx="16.284" cy="12" r=".714"/><circle cx="7.716" cy="16.284" r=".714"/><circle cx="12" cy="16.284" r=".714"/><circle cx="16.284" cy="16.284" r=".714"/></g></svg>';
        return 'data:image/svg+xml;base64,' + btoa(value);
    };



    // LOGO
    x.logo = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" fill="#fff"><path d="M65 130c-36 0-65-29-65-65S29 0 65 0s65 29 65 65-29 65-65 65zm-47 70c0 18.72 15.465 35 35 35s35-15.465 35-35-16.28-35-35.814-35S18 180.465 18 200zm182 95c-52.615 0-95-42.385-95-95s42.385-95 95-95 95 42.385 95 95-42.385 95-95 95zM65 400c-36 0-65-29-65-65s29-65 65-65 65 29 65 65-29 65-65 65zm270 0c-36 0-65-29-65-65s29-65 65-65 65 29 65 65-29 65-65 65zm0-270c-36 0-65-29-65-65s29-65 65-65 65 29 65 65-29 65-65 65zM165 347c0 18.72 15.465 35 35 35s35-15.465 35-35-16.28-35-35.814-35S165 327.465 165 347zm147-147c0 18.72 15.465 35 35 35s35-15.465 35-35-16.28-35-35.814-35S312 180.465 312 200zM165 53c0 18.72 15.465 35 35 35s35-15.465 35-35-16.28-35-35.814-35S165 33.465 165 53z"/></svg>';

    // HASH

    x.getHash = async (type, value) => {
        if (type === 'SHA-512') {
            var result = await crypto.subtle.digest({ name: 'SHA-512' }, x.stringToArrayBuffer(value));
            return '0:' + btoa(x.arrayBufferToString(result));
        } else if (type === 'SHA-256') {
            var result = await crypto.subtle.digest({ name: 'SHA-256' }, x.stringToArrayBuffer(value));
            return '1:' + btoa(x.arrayBufferToString(result));
        } else if (type === 'SHA-512-10') {
            var result = await crypto.subtle.digest({ name: 'SHA-512' }, x.stringToArrayBuffer(value));
            return '2' + btoa(x.arrayBufferToString(result)).substr(0, 9); // -1 because of the prefix
        } else {
            throw new Error();
        }
    };

    // setTimeout(() => {
    //     (async () => {
    //         console.log(await x.getHash('SHA-512', 'value1'));
    //         console.log(await x.getHash('SHA-256', 'value1'));
    //         console.log(await x.getHash('SHA-512-10', 'value1'));
    //     })();
    // }, 10);


    // CSS

    x.addCSS = rules => {
        var element = document.createElement('style');
        element.innerHTML = rules;
        document.head.appendChild(element);
        return element;
    };


    // CRYPTO

    {
        // Keys names
        // 0 - AES-GCM
        // 1 - RSA-OAEP-4096 private key
        // 2 - RSA-OAEP-4096 public key
        // 3 - ECDSA-P-256 private key
        // 4 - ECDSA-P-256 public key
        // 5 - ECDSA-P-521 private key
        // 6 - ECDSA-P-521 public key

        // Data names
        // 3 - AES-GCM
        // 4 - RSA-OAEP
        // 5 - RSA-OAEP + symmetric key

        x.crypto = {};

        x.crypto.encrypt = async (key, text) => {
            if (typeof key !== 'string') {
                throw new Error();
            }
            if (typeof text !== 'string') {
                throw new Error();
            }
            var keyData = x.unpack(key);
            if (keyData.name === '0') {
                var exportedKey = keyData.value;
                exportedKey.alg = "A256GCM";
                exportedKey.ext = true;
                exportedKey.key_ops = ["encrypt", "decrypt"];
                exportedKey.kty = "oct";
                var algorithm = { name: "AES-GCM", iv: crypto.getRandomValues(new Uint8Array(12)) };
                var importedKey = await crypto.subtle.importKey("jwk", exportedKey, "AES-GCM", false, ["encrypt"]);
                var value = btoa(x.arrayBufferToString(await crypto.subtle.encrypt(algorithm, importedKey, (new TextEncoder()).encode(text))));
                //var value = 'DEBUG$' + text;
                var iv = btoa(x.arrayBufferToString(algorithm.iv.buffer));
                return x.pack('3', [value, iv]);
            } else if (keyData.name === '2') {
                if (text.length > 200) { // optimize some day, must be more than exported symmetricKey length
                    var symmetricKey = await x.crypto.generateSymmetricKey('AES-GCM-256');
                    var result = await x.crypto.encrypt(symmetricKey, text);
                    var encryptedKey = await x.crypto.encrypt(key, symmetricKey);
                    return x.pack('5', [encryptedKey, result]);
                } else {
                    var exportedKey = keyData.value;
                    exportedKey.alg = "RSA-OAEP-256";
                    exportedKey.ext = true;
                    exportedKey.key_ops = ["encrypt"];
                    exportedKey.kty = "RSA";
                    var importedKey = await crypto.subtle.importKey("jwk", exportedKey, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
                    var value = btoa(x.arrayBufferToString(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, importedKey, (new TextEncoder()).encode(text))));
                    //var value = 'DEBUG$' + text;
                    return x.pack('4', value);
                }
            }
        };

        x.crypto.decrypt = async (key, text) => {
            if (typeof key !== 'string') {
                throw new Error();
            }
            if (typeof text !== 'string') {
                throw new Error();
            }
            var textData = x.unpack(text);
            var keyData = x.unpack(key);
            if (keyData.name === '0' && textData.name === '3') {
                var exportedKey = keyData.value;
                exportedKey.alg = "A256GCM";
                exportedKey.ext = true;
                exportedKey.key_ops = ["encrypt", "decrypt"];
                exportedKey.kty = "oct";
                var importedKey = await crypto.subtle.importKey("jwk", exportedKey, "AES-GCM", false, ["decrypt"]);
                //return textData.value[0].substr(6);// DEBUG$
                return (new TextDecoder()).decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(x.stringToArrayBuffer(atob(textData.value[1]))) }, importedKey, x.stringToArrayBuffer(atob(textData.value[0]))));
            } else if (keyData.name === '1') {
                if (textData.name === '4') {
                    var exportedKey = keyData.value;
                    exportedKey.alg = "RSA-OAEP-256";
                    exportedKey.ext = true;
                    exportedKey.key_ops = ["decrypt"];
                    exportedKey.kty = "RSA";
                    var importedKey = await crypto.subtle.importKey("jwk", exportedKey, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
                    //return textData.value.substr(6);// DEBUG$
                    return (new TextDecoder()).decode(await crypto.subtle.decrypt({ name: "RSA-OAEP" }, importedKey, x.stringToArrayBuffer(atob(textData.value))));
                } else if (textData.name === '5') {
                    var symmetricKey = await x.crypto.decrypt(key, textData.value[0]);
                    return await x.crypto.decrypt(symmetricKey, textData.value[1]);
                }
            }
        };

        x.crypto.sign = async (key, text) => {
            if (typeof key !== 'string') {
                throw new Error();
            }
            if (typeof text !== 'string') {
                throw new Error();
            }
            var keyData = x.unpack(key);
            if (keyData.name === '3') {
                var exportedKey = keyData.value;
                exportedKey.crv = "P-256";
                exportedKey.ext = true;
                exportedKey.key_ops = ["sign"];
                exportedKey.kty = "EC";
                var importedKey = await crypto.subtle.importKey("jwk", exportedKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
                var signature = await crypto.subtle.sign({ name: "ECDSA", hash: { name: "SHA-384" }, }, importedKey, (new TextEncoder()).encode(text));
                return btoa(x.arrayBufferToString(signature));
            } else if (keyData.name === '5') {
                var exportedKey = keyData.value;
                exportedKey.crv = "P-521";
                exportedKey.ext = true;
                exportedKey.key_ops = ["sign"];
                exportedKey.kty = "EC";
                var importedKey = await crypto.subtle.importKey("jwk", exportedKey, { name: "ECDSA", namedCurve: "P-521" }, false, ["sign"]);
                var signature = await crypto.subtle.sign({ name: "ECDSA", hash: { name: "SHA-512" }, }, importedKey, (new TextEncoder()).encode(text));
                return btoa(x.arrayBufferToString(signature));
            }
        };

        x.crypto.verify = async (key, text, signature) => {
            if (typeof key !== 'string') {
                throw new Error();
            }
            if (typeof text !== 'string') {
                throw new Error();
            }
            if (typeof signature !== 'string') {
                throw new Error();
            }
            var keyData = x.unpack(key);
            if (keyData.name === '4') {
                var exportedKey = keyData.value;
                exportedKey.crv = "P-256";
                exportedKey.ext = true;
                exportedKey.key_ops = ["verify"];
                exportedKey.kty = "EC";
                var importedKey = await crypto.subtle.importKey("jwk", exportedKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
                return await crypto.subtle.verify({ name: "ECDSA", hash: { name: "SHA-384" }, }, importedKey, x.stringToArrayBuffer(atob(signature)), (new TextEncoder()).encode(text));
            } else if (keyData.name === '6') {
                var exportedKey = keyData.value;
                exportedKey.crv = "P-521";
                exportedKey.ext = true;
                exportedKey.key_ops = ["verify"];
                exportedKey.kty = "EC";
                var importedKey = await crypto.subtle.importKey("jwk", exportedKey, { name: "ECDSA", namedCurve: "P-521" }, false, ["verify"]);
                return await crypto.subtle.verify({ name: "ECDSA", hash: { name: "SHA-512" }, }, importedKey, x.stringToArrayBuffer(atob(signature)), (new TextEncoder()).encode(text));
            }
        };

        x.crypto.generateSymmetricKey = async type => {
            if (type === 'AES-GCM-256') {
                var key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
                var exportedKey = await crypto.subtle.exportKey("jwk", key);
                delete exportedKey.alg; // "A256GCM"
                delete exportedKey.ext; // true
                delete exportedKey.key_ops; // ["encrypt", "decrypt"]
                delete exportedKey.kty; // "oct"
                return x.pack('0', exportedKey);
            } else {
                throw new Error();
            }
        };

        x.crypto.generateKeyPair = async type => {
            if (type === 'RSA-OAEP-4096') {
                var keyPair = await crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
                var exportedPrivateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
                delete exportedPrivateKey.alg; // "RSA-OAEP-256"
                delete exportedPrivateKey.ext; // true
                delete exportedPrivateKey.key_ops; // ["decrypt"]
                delete exportedPrivateKey.kty; // "RSA"
                var exportedPublicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
                delete exportedPublicKey.alg; // "RSA-OAEP-256"
                delete exportedPublicKey.ext; // true
                delete exportedPublicKey.key_ops; // ["encrypt"]
                delete exportedPublicKey.kty; // "RSA"
                return {
                    privateKey: x.pack('1', exportedPrivateKey),
                    publicKey: x.pack('2', exportedPublicKey)
                }
            } else if (type === 'ECDSA-P-256') {
                var keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
                var exportedPrivateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
                delete exportedPrivateKey.crv; // "P-256"
                delete exportedPrivateKey.ext; // true
                delete exportedPrivateKey.key_ops; // ["sign"]
                delete exportedPrivateKey.kty; // "EC"
                var exportedPublicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
                delete exportedPublicKey.crv; // "P-256"
                delete exportedPublicKey.ext; // true
                delete exportedPublicKey.key_ops; // ["verify"]
                delete exportedPublicKey.kty; // "EC"
                return {
                    privateKey: x.pack('3', exportedPrivateKey),
                    publicKey: x.pack('4', exportedPublicKey)
                }
            } else if (type === 'ECDSA-P-521') { // not supported on iOS (checked on November 2, 2020)
                var keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-521" }, true, ["sign", "verify"]);
                var exportedPrivateKey = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
                delete exportedPrivateKey.crv; // "P-521"
                delete exportedPrivateKey.ext; // true
                delete exportedPrivateKey.key_ops; // ["sign"]
                delete exportedPrivateKey.kty; // "EC"
                var exportedPublicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
                delete exportedPublicKey.crv; // "P-521"
                delete exportedPublicKey.ext; // true
                delete exportedPublicKey.key_ops; // ["verify"]
                delete exportedPublicKey.kty; // "EC"
                return {
                    privateKey: x.pack('5', exportedPrivateKey),
                    publicKey: x.pack('6', exportedPublicKey)
                }
            } else {
                throw new Error();
            }
        };

        x.crypto.deriveSymmetricKey = async (input, salt) => {
            if (typeof input !== 'string') {
                throw new Error();
            }
            if (typeof salt !== 'string') {
                throw new Error();
            }
            var importedKey = await crypto.subtle.importKey("raw", (new TextEncoder()).encode(input), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]);
            var key = await crypto.subtle.deriveKey({ "name": "PBKDF2", salt: x.stringToArrayBuffer(salt), "iterations": 999999, "hash": "SHA-256" }, importedKey, { "name": "AES-GCM", "length": 256 }, true, ["encrypt", "decrypt"]);
            var exportedKey = await crypto.subtle.exportKey("jwk", key);
            delete exportedKey.alg; // "A256GCM"
            delete exportedKey.ext; // true
            delete exportedKey.key_ops; // ["encrypt", "decrypt"]
            delete exportedKey.kty; // "oct"
            return x.pack('0', exportedKey);
        };

        x.crypto.deriveID = async input => {
            if (typeof input !== 'string') {
                throw new Error();
            }
            var result = await crypto.subtle.digest({ name: "SHA-256" }, x.stringToArrayBuffer(input));
            var array = new Uint16Array(result);
            var result = '';
            array.forEach(value => {
                result += value.toString(36);
            });
            return result;
        };

        // setTimeout(() => {
        //     (async () => {
        //         var id1 = await x.crypto.deriveID('input1');
        //         console.log(id1);
        //     })();
        // }, 10);

        // setTimeout(() => {
        //     (async () => {
        //         var key1 = await x.crypto.deriveSymmetricKey('secret1', 'salt1');
        //         console.log(key1);
        //         var result = await x.crypto.encrypt(key1, '1231231233'.repeat(20));
        //         console.log(result);
        //         var key2 = await x.crypto.deriveSymmetricKey('secret1', 'salt1');
        //         console.log(key2);
        //         var result = await x.crypto.decrypt(key2, result);
        //         console.log(result);
        //     })();
        // }, 10);

        // setTimeout(() => {
        //     (async () => {
        //         var keyPair = await x.crypto.generateKeyPair('RSA-OAEP-4096');
        //         console.log(keyPair.privateKey);
        //         console.log(keyPair.publicKey);
        //         var result = await x.crypto.encrypt(keyPair.publicKey, '1231231233'.repeat(120));
        //         console.log(result);
        //         var result = await x.crypto.decrypt(keyPair.privateKey, result)
        //         console.log(result);
        //     })();
        // }, 10);

        // setTimeout(() => {
        //     (async () => {
        //         var key = await x.crypto.generateSymmetricKey('AES-GCM-256');
        //         console.log(key);
        //         var result = await x.crypto.encrypt(key, '1231231233'.repeat(120));
        //         console.log(result);
        //         var result = await x.crypto.decrypt(key, result)
        //         console.log(result);
        //     })();
        // }, 10);

        // setTimeout(() => {
        //     (async () => {
        //         var keyPair = await x.crypto.generateKeyPair('ECDSA-P-521');
        //         console.log(keyPair.privateKey);
        //         console.log(keyPair.publicKey);
        //         var result = await x.crypto.sign(keyPair.privateKey, '1231231233');
        //         console.log(result);
        //         var result = await x.crypto.verify(keyPair.publicKey, '1231231233', result)
        //         console.log(result);
        //     })();
        // }, 10);

        // setTimeout(() => {
        //     (async () => {
        //         var keyPair = await x.crypto.generateKeyPair('ECDSA-P-256');
        //         console.log(keyPair.privateKey);
        //         console.log(keyPair.publicKey);
        //         var result = await x.crypto.sign(keyPair.privateKey, '1231231233');
        //         console.log(result);
        //         var result = await x.crypto.verify(keyPair.publicKey, '1231231233', result)
        //         console.log(result);
        //     })();
        // }, 10);

    }



    // KEY BOX

    x.keyBox = {};
    x.keyBox.make = value => {
        if (typeof value !== 'undefined' && value !== null) {
            value = x.unpack(value);
            if (value.name === '') {
                value = value.value;
            } else {
                throw new Error();
            }
        } else {
            var value = [];
        }

        var add = key => { // todo validate
            var otherIDs = [];
            value.forEach(item => {
                otherIDs.push(item[0]);
            });
            var id = x.generateOtherUniqueID(otherIDs);
            value.push([id, key]);
            return id;
        };

        var set = (id, key) => {
            delete_(id);
            value.push([id, key]);
        };

        var delete_ = id => {
            var temp = [];
            for (var i = 0; i < value.length; i++) {
                var item = value[i];
                if (item[0] !== id) {
                    temp.push(item);
                }
            }
            value = temp;
        };

        var getList = () => {
            var result = [];
            for (var i = 0; i < value.length; i++) {
                var item = value[i];
                result.push({
                    id: item[0],
                    key: item[1],
                    operation: getKeyOperation(item[1])
                });
            }
            return result;
        };

        var get = id => {
            for (var i = 0; i < value.length; i++) {
                var item = value[i];
                if (item[0] === id) {
                    return {
                        id: item[0],
                        key: item[1]
                    };
                }
            }
            return null;
        };

        var getKeyOperation = key => {
            var keyData = x.unpack(key);
            var keyName = keyData.name;
            if (['0', '2'].indexOf(keyName) !== -1) {
                return 'encrypt';
            } else if (['0', '1'].indexOf(keyName) !== -1) {
                return 'decrypt';
            } else if (['3', '5'].indexOf(keyName) !== -1) {
                return 'sign';
            } else if (['4', '6'].indexOf(keyName) !== -1) {
                return 'verify';
            } else {
                throw new Error();
            }
        };

        var retire = id => {
            // todo // keep id ??
        };

        var getLast = operation => {
            for (var i = value.length - 1; i >= 0; i--) {
                var item = value[i];
                if (getKeyOperation(item[1]) === operation) {
                    return {
                        id: item[0],
                        key: item[1]
                    };
                }
            }
            return null;
        };

        var getValue = () => {
            return x.pack('', value);
        };

        return {
            add: add,
            get: get,
            set: set,
            getList: getList,
            delete: delete_,
            getLast: getLast,
            getValue: getValue,
        }
    };

    // setTimeout(() => {
    //     (async () => {

    //         var box = x.keyBox.make();

    //         var key = await x.crypto.generateSymmetricKey('AES-GCM-256');
    //         var id = box.add(key);

    //         var keyPair = await x.crypto.generateKeyPair('ECDSA-P-521');
    //         //         console.log(keyPair.privateKey);
    //         //         console.log(keyPair.publicKey);
    //         var id = box.add(keyPair.publicKey);

    //         console.log(box.get(id));
    //         console.log(box.getLast('encrypt'));
    //         console.log(box.getLast('decrypt'));
    //         console.log(box.getLast('sign'));
    //         console.log(box.getLast('verify'));
    //         console.log(box.getValue());
    //     })();
    // }, 10);

    x.cryptoData = {};

    x.cryptoData.encrypt = async (text, keyBox) => {
        var key = keyBox.getLast('encrypt');
        var value = await x.crypto.encrypt(key.key, text);
        return x.pack('a', [key.id, value]);
    };

    x.cryptoData.decrypt = async (text, keyBox) => {
        var textData = x.unpack(text);
        if (textData.name === 'a') {
            var keyID = textData.value[0];
            var encryptedText = textData.value[1];
            var key = keyBox.get(keyID);
            return await x.crypto.decrypt(key.key, encryptedText);
        }
    };

    x.cryptoData.sign = async (text, keyBox) => {
        var key = keyBox.getLast('sign');
        var value = await x.crypto.sign(key.key, text);
        return x.pack('b', [key.id, value]);
    };

    x.cryptoData.verify = async (text, signature, keyBox) => {
        var key = keyBox.getLast('verify');
        var signatureData = x.unpack(signature);
        if (signatureData.name === 'b') {
            var keyID = signatureData.value[0];
            var signatureValue = signatureData.value[1];
            var key = keyBox.get(keyID);
            return await x.crypto.verify(key.key, text, signatureValue);
        }
        return false;
    };

    // setTimeout(() => {
    //     (async () => {

    //         var privateKeys = x.keyBox.make();
    //         var publicKeys = x.keyBox.make();

    //         var keyPair = await x.crypto.generateKeyPair('RSA-OAEP-4096');
    //         var id = privateKeys.add(keyPair.privateKey);
    //         publicKeys.set(id, keyPair.publicKey);

    //         var keyPair = await x.crypto.generateKeyPair('ECDSA-P-521');
    //         var id = privateKeys.add(keyPair.privateKey);
    //         publicKeys.set(id, keyPair.publicKey);

    //         var result = await x.cryptoData.encrypt('123', publicKeys);
    //         console.log(result);

    //         var result = await x.cryptoData.decrypt(result, privateKeys);
    //         console.log(result);

    //         var signature = await x.cryptoData.sign('123', privateKeys);
    //         console.log(signature);

    //         var result = await x.cryptoData.verify('123', signature, publicKeys);
    //         console.log(result);

    //     })();
    // }, 10);



    // OTHERS

    // x.escapeHTML = text => {
    //     let div = document.createElement('div');
    //     div.innerText = text;
    //     return div.innerHTML;
    // };

    x.getHumanDate = (milliseconds, prefix = '') => {
        var date = new Date(milliseconds);
        var todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        var options = { timeStyle: 'short' };
        if (date.getTime() > todayStart.getTime()) {
            prefix += (prefix !== '' ? ' today at ' : 'Today at ');
        } else if (date.getTime() > todayStart.getTime() - 86400000) {
            prefix += (prefix !== '' ? ' yesterday at ' : 'Yesterday at ');
        } else {
            if (prefix !== '') {
                prefix += ' on ';
            }
            options = { dateStyle: 'long', timeStyle: 'short' }; //year: 'numeric', month: 'long', day: 'numeric', 
        }
        return prefix + (new Intl.DateTimeFormat('en', options).format(date));
    };

    x.arrayBufferToString = buffer => {
        //return String.fromCharCode.apply(null, new Uint8Array(buffer));
        // todo is .slice() faster???
        var array = new Uint8Array(buffer);
        var result = '';
        var length = array.byteLength;
        for (var i = 0; i < length; i++) {
            result += String.fromCharCode(array[i]);
        }
        return result;
    };

    x.stringToArrayBuffer = string => {
        var length = string.length;
        var result = new Uint8Array(length); //new ArrayBuffer(length)
        for (var i = 0; i < length; i++) {
            result[i] = string.charCodeAt(i);
        }
        return result.buffer;
    };

    // setTimeout(() => {
    //     (async () => {
    //         console.log(await x.stringToArrayBuffer('test'));
    //         console.log(await x.arrayBufferToString(await x.stringToArrayBuffer('test')));
    //     })();
    // }, 10);

    x.stringReplaceAll = (string, find, replace) => {
        return string.split(find).join(replace);
    };

    x.getPropertyFullKey = key => {
        if (key.indexOf('.') === -1) { // special
            var parts = key.toLowerCase().trim().split(':');
            var aliasHost = x.getAliasHost(parts[0] === 'x' ? '' : parts[0]);
            if (aliasHost !== null) {
                return aliasHost + ':' + parts[1];
            }
        }
        return key;
    };

    x.getPropertyKeyHost = key => {
        var parts = key.toLowerCase().trim().split(':');
        if (parts.length === 2 && parts[0].length > 0 && parts[1].length > 0) {
            return parts[0];
        }
        return null;
    };


    // TODO SHOULD NOT BE HERE but needed in core

    x.groups = {};

    x.groups.generateMemberID = async (userID, membersIDSalt) => {
        return await x.crypto.deriveID(userID + ':' + membersIDSalt);
    };

    x.groups.getMemberID = async (groupID, userID) => {
        var properties = await x.services.call('groups', 'getDetails', { groupID: groupID, details: ['membersIDSalt'] });
        if (properties === null) {
            return null;
        }
        return await x.groups.generateMemberID(userID, properties.membersIDSalt);
    };

    // PACK

    x.pack = (name, value) => {
        if (typeof name !== 'string') {
            throw new Error('x.pack name must be string!');
        }
        if (name.indexOf(':') !== -1) {
            throw new Error('x.pack name is not valid!');
        }
        if (typeof value === 'undefined') {
            throw new Error('x.pack value is undefined!');
        }
        return name + ':' + JSON.stringify(value);
    };

    x.unpack = value => {
        try {
            var index = value.indexOf(':');
            if (index !== -1) {
                return {
                    name: value.substr(0, index),
                    value: JSON.parse(value.substr(index + 1))
                };
            }
            var error = x.makeAppError('Invalid value!');
        } catch (e) {
            var error = x.makeAppError(e);
        }
        error.details['unpack'] = {
            value: value,
            index: index
        };
        throw error;
    };

    // TOOLTIPS

    x.makeTooltip = (container, options = {}) => {
        var floating = options.floating !== undefined ? options.floating : false;
        var destroyOnHide = options.destroyOnHide !== undefined ? options.destroyOnHide : true;
        var element = document.createElement('div');
        element.setAttribute('class', 'x-tooltip'); // invisible container that captures the click and prevents access to the elements below
        element.innerHTML = '<div></div>';
        element.style.top = '-100000px';
        if (floating) {
            element.style.pointerEvents = 'none';
            element.firstChild.style.pointerEvents = 'all';
        }
        container.appendChild(element);
        var hideOnResize = () => {
            hide();
        };
        var destroy = () => {
            element.parentNode.removeChild(element);
            window.removeEventListener('resize', hideOnResize);
        };
        var hide = () => {
            if (destroyOnHide) {
                destroy();
            } else {
                element.style.top = '-100000px';
            }
        };
        element.addEventListener('click', hide);
        return {
            addButton: (text, callback) => {
                var button = document.createElement('a');
                button.innerText = text;
                button.setAttribute('tabindex', '0');
                button.setAttribute('role', 'button');
                button.setAttribute('aria-label', text);
                x.addClickToOpen(button, e => {
                    e.stopPropagation();
                    hide();
                    callback();
                });
                element.firstChild.appendChild(button);
            },
            show: target => {
                window.addEventListener('resize', hideOnResize);
                var maxWidth = window.innerWidth;
                var maxHeight = window.innerHeight;
                var contentWidth = element.firstChild.offsetWidth;
                var contentHeight = element.firstChild.offsetHeight;
                var rect = target.getBoundingClientRect();
                var targetCenterLeft = rect.left + rect.width * 2 / 3;
                var targetCenterTop = rect.top + rect.height * 2 / 3;
                if (targetCenterLeft < 5) {
                    targetCenterLeft = 5;
                }
                if (targetCenterLeft > maxWidth - contentWidth - 5) {
                    targetCenterLeft = maxWidth - contentWidth - 5;
                }
                if (targetCenterTop < 5) {
                    targetCenterTop = 5;
                }
                if (targetCenterTop > maxHeight - contentHeight - 5) {
                    targetCenterTop = maxHeight - contentHeight - 5;
                }
                element.style.top = '0';
                element.firstChild.style.left = targetCenterLeft + 'px';
                element.firstChild.style.top = targetCenterTop + 'px';
            },
            hide: hide,
            destroy: destroy,
            element: element.firstChild
        };
    };


    // 

    x.addClickToOpen = (element, data) => {
        var tempData = null;
        var run = (preload, e) => {
            if (tempData === null) {
                tempData = {};
                if (typeof data === 'object') {
                    tempData.location = data.location;
                    tempData.args = data.args !== undefined ? data.args : {};
                    tempData.preload = data.preload !== undefined;
                } else {
                    tempData.location = null;
                    tempData.preload = false;
                }
            }
            if (tempData.preload) {
                if (preload) {
                    if (tempData.preloadData === undefined) {
                        //console.time('preload ' + tempData.location);
                        tempData.preloadData = x.preload(tempData.location, tempData.args);
                    }
                    return;
                } else {
                    //console.timeEnd('preload ' + tempData.location);
                    if (tempData.preloadData !== undefined) {
                        Promise.resolve(tempData.preloadData)
                            .then(windowID => {
                                tempData = null;
                                x.openPreloaded(windowID);
                            });
                        return;
                    }
                }
            }
            if (tempData.location !== null) {
                x.open(tempData.location, tempData.args);
            } else if (typeof data === 'function') {
                if (!preload) {
                    data(e);
                }
            } else {
                throw new Exception('Should not get here addClickToOpen');
            }
        };
        element.addEventListener('touchstart', e => { // todo detect touch scroll
            //console.log('touchstart ' + (new Date()).getTime());
            run(true, e);
        });
        element.addEventListener('mousedown', e => {
            //console.log('mousedown ' + (new Date()).getTime());
            run(true, e);
        });
        element.addEventListener('click', e => {
            //console.log('click ' + (new Date()).getTime());
            run(false, e);
        });
        element.addEventListener('keydown', e => {
            if (e.keyCode === 13) {
                run(false, e);
            }
        });
    };

    x.convertHTML = (html, format = 'richText') => {
        html = html.split('%').join(encodeURI('%'));
        html = html.split('[').join(encodeURI('['));
        html = html.split(']').join(encodeURI(']'));
        html = html.split('<b><br></b>').join('<br>');
        html = html.split('<i><br></i>').join('<br>');
        html = html.split('<em><br></em>').join('<br>');
        html = html.split('&nbsp;').join(' ');

        // html = html.split('<p>').join('<div>');
        // html = html.split('<p ').join('<div ');
        // html = html.split('</p>').join('</div>');

        let fragment = new DocumentFragment();
        var main = document.createElement('main');
        main.innerHTML = html;
        fragment.appendChild(main);

        // Flattens div trees. Wrap text nodes into divs.
        var updateChildren = element => {
            var pendingNodes = [];
            var addPending = child => {
                pendingNodes.push(child);
            };
            var update = () => {
                if (pendingNodes.length > 0) {
                    var index = 0;
                    var children = element.childNodes;
                    for (var i = 0; i < children.length; i++) {
                        if (children[i] === pendingNodes[0]) {
                            index = i;
                            break;
                        }
                    }
                    var newElement = document.createElement('div');
                    var nodesCount = pendingNodes.length;
                    for (var i = 0; i < nodesCount; i++) {
                        newElement.appendChild(pendingNodes[i]);
                    }
                    if (children[index] !== undefined) {
                        element.insertBefore(newElement, children[index]);
                    } else {
                        element.appendChild(newElement);
                    }
                    pendingNodes = [];
                    return newElement;
                }
                return null;
            };
            var elementsToRemove = [];
            for (var child of element.childNodes) {
                if (child.nodeType === 3) {
                    addPending(child);
                } else if (child.nodeType === 1) {
                    var tagName = child.tagName.toLowerCase();
                    if (tagName === 'br') {
                        if (update() !== null) {
                            elementsToRemove.push(child);
                        }
                    } else if (tagName === 'div') {
                        update();
                        if (child.innerText !== child.innerHTML) { // Has HTML inside
                            updateChildren(child);
                            child.outerHTML = child.innerHTML;
                        }
                    } else {
                        addPending(child);
                    }
                }
            }
            update();
            for (var elementToRemove of elementsToRemove) {
                element.removeChild(elementToRemove);
            }
        };
        updateChildren(fragment.firstChild);

        // Replace div tags
        fragment.querySelectorAll('div').forEach(element => {
            element.outerHTML = element.innerHTML + (element.nextSibling !== null ? "\n" : '');
        });

        // Replace br tags
        fragment.querySelectorAll('br').forEach(element => {
            element.outerHTML = "\n";
        });

        // Replace other tags
        var tagsToReplace = {
            'b': 'b',
            'em': 'i',
            'i': 'i',
            'strike': 's',
            's': 's',
            'ol': 'ol',
            'ul': 'ul',
            'li': 'li'
        };
        for (var tagName in tagsToReplace) {
            var newName = tagsToReplace[tagName];
            fragment.querySelectorAll(tagName).forEach(element => {
                if (element.innerHTML.trim().length > 0) {
                    element.outerHTML = '[' + newName + ']' + element.innerHTML + '[/' + newName + ']';
                }
            });
        }

        var convertQuotes = text => {
            return text.split('"').join(encodeURI('"'));
        };


        // Must be before updating <a>, because there may be "<div>" in the title
        var elementsToRemove = [];

        fragment.firstChild.querySelectorAll('*').forEach(element => {
            if (element.tagName.toLowerCase() === 'a' && element.innerHTML.trim().length > 0) {
                var url = element.getAttribute('href');
                var title = element.getAttribute('title');
                if (url !== null && url.length > 0) {
                    element.insertAdjacentText('beforebegin', '[a href="' + convertQuotes(url) + '"' + (title !== null && title.length > 0 ? ' title="' + convertQuotes(title) + '"' : '') + ']');
                    element.insertAdjacentHTML('beforebegin', element.innerHTML);
                    element.insertAdjacentText('beforebegin', '[/a]');
                    element.parentNode.removeChild(element);
                } else {
                    element.outerHTML = element.innerHTML;
                }
                return;
            }
            elementsToRemove.push(element);
        });
        for (var elementToRemove of elementsToRemove) {
            try {
                elementToRemove.parentNode.removeChild(elementToRemove);
            } catch (e) {

            }
        }

        return fragment.firstChild.innerText.trim();
    };

    x.convertRichText = (text, format = 'default') => {
        var convertBackQuotes = text => {
            return text.split(encodeURI('"')).join('"');
        };
        var htmlEncode = text => {
            text = text.split('&').join('&amp;');
            text = text.split('<').join('&lt;');
            text = text.split('>').join('&gt;');
            text = text.split('"').join('&quot;');
            text = text.split('  ').join('&nbsp; '); // Todo fix for space in the beginning of a line
            return text;
        };
        var htmlDecode = text => {
            text = text.split('&lt;').join('<');
            text = text.split('&gt;').join('>');
            text = text.split('&quot;').join('"');
            text = text.split('&nbsp;').join(' ');
            text = text.split('&amp;').join('&'); // Must be last
            return text;
        };
        if (format === 'text') {
            text = text.replace(/\[li\]/g, "- "); // Todo show numbers for ol
            text = text.replace(/\[(\/ol|ol|\/ul|ul|\/b|b|\/i|i|\/s|s|\/a)\]/g, "");
            text = text.replace(/\[\/li\](.)/g, "\n$1");
            text = text.replace(/\[\/li\]/g, "");
            text = text.replace(/\[a.*?\]/g, "");
        } else {
            text = htmlEncode(text);
            text = text.replace(/\[(\/ol|ol|\/ul|ul|\/li|li|\/b|b|\/i|i|\/s|s|\/a)\]/g, "<$1>");
            var matches = text.match(/\[a.*?\]/g);
            if (matches !== null) {
                for (var tag of matches) {
                    var decodedTag = htmlDecode(tag);
                    var attributeValue = decodedTag.match(/href="(.*?)"/);
                    var url = attributeValue !== null ? convertBackQuotes(attributeValue[1]) : '';
                    var attributeValue = decodedTag.match(/title="(.*?)"/);
                    var title = attributeValue !== null ? convertBackQuotes(attributeValue[1]) : '';
                    if (format === 'preview') {
                        var value = '<a>';
                    } else if (format === 'html') {
                        var value = '<a' + (url.length > 0 ? ' href="' + htmlEncode(url) + '"' : '') + '' + (title.length > 0 ? ' title="' + htmlEncode(title) + '"' : '') + '>';
                    } else {
                        var onClick = 'x.previewURL(' + JSON.stringify(url) + ',' + JSON.stringify(title) + ');';
                        var value = '<a' + (url.length > 0 ? ' onclick="' + htmlEncode(onClick) + '"' : '') + '' + (title.length > 0 ? ' title="' + htmlEncode(title) + '"' : '') + '>';
                    }
                    text = text.replace(tag, value);
                };
            }
            if (format === 'html') {
                text = text.replace(/\n/g, "<br>");
            } else {
                text = '<p>' + text.split("\n").join('</p><br><p>') + '</p>';
                text = text.split('<p></p>').join('');
            }
        }
        text = text.split(encodeURI('[')).join('[');
        text = text.split(encodeURI(']')).join(']');
        text = text.split(encodeURI('%')).join('%');
        return text;
    };

    x.convertText = (text, mode = 'default') => {
        var htmlEncode = text => {
            text = text.split('&').join('&amp;');
            text = text.split('<').join('&lt;');
            text = text.split('>').join('&gt;');
            text = text.split('"').join('&quot;');
            text = text.split('  ').join('&nbsp; '); // Todo fix for space in the beginning of a line
            return text;
        };
        text = htmlEncode(text);
        if (mode === 'html') {
            text = text.replace(/\n/g, "<br>");
        } else {
            text = '<p>' + text.split("\n").join('</p><br><p>') + '</p>';
            text = text.split('<p></p>').join('');
        }
        return text;
    };

    x.deviceHasPushManagerSupport = () => {
        return 'serviceWorker' in navigator && 'PushManager' in window;
    };

    x.loadImage = async source => {
        return await new Promise((resolve, reject) => {
            var img = new Image();
            img.addEventListener('load', () => {
                resolve(img);
            });
            img.addEventListener('error', e => {
                reject(e);
            });
            img.src = source;
        });
    }

}