(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ObservableSlim = {}));
})(this, (function (exports) { 'use strict';

    function getType(source) {
        return Object.prototype.toString.call(source).slice('[object '.length, -1);
    }
    function isArray(x) {
        return getType(x) === 'Array';
    }
    function isString(x) {
        return getType(x) === 'String';
    }
    function isNumber(x) {
        return getType(x) === 'Number';
    }
    function isUndef(x) {
        return x === undefined || x === null;
    }
    function isNumberPlus(x) {
        return /^\d+$/gi.test(x);
    }

    /**
     * set get pathSolve
     * @param path
     */
    function validPath(path, pathOrigin) {
        let out = true;
        if (!isArray(path)) {
            out = false;
            console.error(`${path} should be Array`);
        }
        else {
            for (let i = 0; i < path.length; i++) {
                if (path[i] === 'undefined') {
                    out = false;
                    console.error(`(${pathOrigin}) => (${path})) should not include undefined. get method will back alterValue`);
                }
            }
        }
        return out;
    }
    function pathResolve(path) {
        let pathResolve = [];
        /* istanbul ignore else */
        if (isString(path) || isNumber(path)) {
            pathResolve = String(path).split('.');
        }
        else if (isArray(path)) {
            if (path.length === 0)
                return pathResolve;
            const flatPath = path
                .filter(i => isString(i) || isNumber(i))
                .map(i => String(i))
                .reduce((cur, next) => `${cur}.${next}`);
            pathResolve = flatPath.split('.');
        }
        return validPath(pathResolve, path) ? pathResolve : [];
    }

    function set(obj, path, value, useType) {
        if (isUndef(obj)) {
            return new Error(`undefined null is not allowed`);
        }
        const pathOut = pathResolve(path);
        if (pathOut.length === 0) {
            return obj;
        }
        pathOut.reduce((cur, next, index) => {
            const isEnd = index === pathOut.length - 1;
            if (isEnd) {
                return (cur[next] = value);
            }
            if (isUndef(cur[next])) {
                return (cur[next] = useType
                    ? useType === 'array'
                        ? []
                        : {}
                    : isNumberPlus(pathOut[index + 1])
                        ? []
                        : {});
            }
            else {
                return cur[next];
            }
        }, obj);
        return obj;
    }

    var OperationTypeEnum;
    (function (OperationTypeEnum) {
        OperationTypeEnum["NEW"] = "NEW";
        OperationTypeEnum["UPDATE"] = "UPDATE";
        OperationTypeEnum["DELETE"] = "DELETE";
        OperationTypeEnum["SORT"] = "SORT";
    })(OperationTypeEnum || (OperationTypeEnum = {}));
    function diffTwoArray(origin, newArr, config) {
        const { flag, otherMes } = Object.assign({ flag: "itemId", otherMes: () => ({}) }, config || {});
        const originFlagArr = origin.map((i) => i[flag]);
        const newArrFlagArr = newArr.map((i) => i[flag]);
        const addItem = [];
        const deleteItem = [];
        originFlagArr.forEach((i, index) => {
            if (!newArrFlagArr.includes(i)) {
                deleteItem.push({
                    operationType: OperationTypeEnum.DELETE,
                    elementIndex: index - deleteItem.length,
                    oldValue: origin[index],
                    ...otherMes(),
                });
            }
        });
        newArrFlagArr.forEach((i, index) => {
            if (!originFlagArr.includes(i)) {
                const item = {
                    operationType: OperationTypeEnum.NEW,
                    elementIndex: index,
                    newValue: newArr[index],
                    ...otherMes(),
                };
                addItem.push(item);
            }
        });
        if (addItem.length || deleteItem.length) {
            return [...deleteItem, ...addItem];
        }
        // sort
        return [
            {
                operationType: OperationTypeEnum.SORT,
                newValue: newArrFlagArr,
                oldValue: originFlagArr,
                ...otherMes(),
            },
        ];
    }

    /*
     * 	Observable Slim
     *	Version 0.1.6
     * 	https://github.com/elliotnb/observable-slim
     *
     * 	Licensed under the MIT license:
     * 	http://www.opensource.org/licenses/MIT
     *
     *	Observable Slim is a singleton that allows you to observe changes made to an object and any nested
     *	children of that object. It is intended to assist with one-way data binding, that is, in MVC parlance,
     *	reflecting changes in the model to the view. Observable Slim aspires to be as lightweight and easily
     *	understood as possible. Minifies down to roughly 3000 characters.
     */
    const SLIM_PREFIX = "__slim_";
    const SLIM_KEYS = [
        "length",
        "arrOpPending",
        "isProxy",
        "getTarget",
        "getParent",
        "getPath",
        "targetPosition",
        "arrOpChain",
    ];
    const sFlag = SLIM_KEYS.reduce((cur, next) => {
        // TODO if remove 'as string' Type 'string' is not assignable to type 'never'. ? why
        cur[next] = rKey(next);
        return cur;
    }, {});
    function rKey(x) {
        return `${SLIM_PREFIX}${x}`;
    }
    function setTargetValue(target, key, value) {
        set(target, rKey(key), value);
    }
    function isSlimArray(x) {
        return isArray(x);
    }
    const ARRAY_OPERATION_EXTRACT = ["shift", "pop"];
    const ARRAY_OPERATION_ADD = ["push", "unshift"];
    const ARRAY_OPERATION = [...ARRAY_OPERATION_EXTRACT, ...ARRAY_OPERATION_ADD, "splice", "reverse"];
    function isArrayChange(target, property) {
        return isArray(target) && /^\d+$/gi.test(`${property}`);
    }
    // for generate __slim_index
    let index = 1;
    // An array that stores all of the observables created through the public create() method below.
    const observables = [];
    // An array of all the objects that we have assigned Proxies to
    const targets = [];
    // An array of arrays containing the Proxies created for each target object. targetsProxy is index-matched with
    // 'targets' -- together, the pair offer a Hash table where the key is not a string nor number, but the actual target object
    const targetsProxy = [];
    // this variable tracks duplicate proxies assigned to the same target.
    // the 'set' handler below will trigger the same change on all other Proxies tracking the same target.
    // however, in order to avoid an infinite loop of Proxies triggering and re-triggering one another, we use dupProxy
    // to track that a given Proxy was modified from the 'set' handler
    let dupProxy = null;
    const _getProperty = function (obj, path) {
        return path.split(".").reduce(function (prev, curr) {
            return prev ? prev[curr] : undefined;
        }, obj || {});
    };
    /**
     * Create a new ES6 `Proxy` whose changes we can observe through the `observe()` method.
     * @param {object} target Plain object that we want to observe for changes.
     * @param {boolean|number} domDelay If `true`, then the observed changes to `target` will be batched up on a 10ms delay (via `setTimeout()`).
     * If `false`, then the `observer` function will be immediately invoked after each individual change made to `target`. It is helpful to set
     * `domDelay` to `true` when your `observer` function makes DOM manipulations (fewer DOM redraws means better performance). If a number greater
     * than zero, then it defines the DOM delay in milliseconds.
     * @param {function(ObservableSlimChange[])} [observer] Function that will be invoked when a change is made to the proxy of `target`.
     * When invoked, this function is passed a single argument: an array of `ObservableSlimChange` detailing each change that has been made.
     * @param {object} originalObservable The original observable created by the user, exists for recursion purposes, allows one observable to observe
     * change on any nested/child objects.
     * @param {{target: object, property: string}[]} originalPath Array of objects, each object having the properties `target` and `property`:
     * `target` is referring to the observed object itself and `property` referring to the name of that object in the nested structure.
     * The path of the property in relation to the target on the original observable, exists for recursion purposes, allows one observable to observe
     * change on any nested/child objects.
     * @returns {ProxyConstructor} Proxy of the target object.
     */
    const _create = function (target, domDelay, originalObservable, originalPath) {
        var observable = originalObservable || null;
        // record the nested path taken to access this object -- if there was no path then we provide the first empty entry
        const path = originalPath || [{ target: target, property: "" }];
        // in order to accurately report the "previous value" of the "length" property on an Array
        // we must use a helper property because intercepting a length change is not always possible as of 8/13/2018 in
        // Chrome -- the new `length` value is already set by the time the `set` handler is invoked
        if (isSlimArray(target)) {
            if (!target.hasOwnProperty(sFlag.length))
                Object.defineProperty(target, sFlag.length, {
                    enumerable: false,
                    value: target.length,
                    writable: true,
                });
            else
                target[sFlag.length] = target.length;
        }
        let changes = [];
        /**
         * Returns a string of the nested path (in relation to the top-level observed object) of the property being modified or deleted.
         * @param {object} target Plain object that we want to observe for changes.
         * @param {string} property Property name.
         * @param {boolean} [jsonPointer] Set to `true` if the string path should be formatted as a JSON pointer rather than with the dot notation
         * (`false` as default).
         * @returns {string} Nested path (e.g., `hello.testing.1.bar` or, if JSON pointer, `/hello/testing/1/bar`).
         */
        const _getPath = function (target, property) {
            let fullPath = "";
            let itemIdPath = "";
            let lastTarget = null;
            // loop over each item in the path and append it to full path
            for (var i = 0; i < path.length; i++) {
                const curPath = path[i];
                const { target, property, itemId } = curPath;
                // if the current object was a member of an array, it's possible that the array was at one point
                // mutated and would cause the position of the current object in that array to change. we perform an indexOf
                // lookup here to determine the current position of that object in the array before we add it to fullPath
                if (lastTarget instanceof Array && !isNaN(property)) {
                    curPath.property = lastTarget.indexOf(curPath.target);
                }
                fullPath = fullPath + "." + curPath.property;
                itemIdPath = itemIdPath + (itemId ? `[${itemId}]` : `.${property}`);
                lastTarget = target;
            }
            // add the current property
            let latestItemName = `${isUndef(property) ? "" : `.${property}`}`;
            fullPath = fullPath + latestItemName;
            if (isSlimArray(target) && /^\d+$/g.test(property)) {
                const curItemId = target[property].itemId;
                if (isUndef(curItemId)) {
                    console.error(`
          List must have itemId props
        `);
                }
                else {
                    latestItemName = `[${target[property].itemId}]`;
                }
            }
            itemIdPath = itemIdPath + latestItemName;
            // remove the beginning two dots -- ..foo.bar becomes foo.bar (the first item in the nested chain doesn't have a property name)
            fullPath = fullPath.substring(2);
            const unusedPrefixLength = itemIdPath.charAt(1) === "[" ? 1 : 2;
            return {
                fullPath,
                itemIdPath: itemIdPath.substring(unusedPrefixLength),
            };
        };
        const _notifyObservers = function (numChanges, immediate = false) {
            // if the observable is paused, then we don't want to execute any of the observer functions
            if (observable.paused === true)
                return;
            const domDelayIsNumber = typeof domDelay === "number";
            // execute observer functions on a 10ms setTimeout, this prevents the observer functions from being executed
            // separately on every change -- this is necessary because the observer functions will often trigger UI updates
            if (domDelayIsNumber || domDelay === true) {
                setTimeout(function () {
                    if (numChanges === changes.length) {
                        // we create a copy of changes before passing it to the observer functions because even if the observer function
                        // throws an error, we still need to ensure that changes is reset to an empty array so that old changes don't persist
                        const changesCopy = changes.slice(0);
                        changes = [];
                        // invoke any functions that are observing changes
                        for (let i = 0; i < observable.observers.length; i++)
                            observable.observers[i](changesCopy);
                    }
                }, domDelayIsNumber && domDelay > 0 ? domDelay : 10);
            }
            else {
                // we create a copy of changes before passing it to the observer functions because even if the observer function
                // throws an error, we still need to ensure that changes is reset to an empty array so that old changes don't persist
                const changesCopy = changes.slice(0);
                changes = [];
                // invoke any functions that are observing changes
                if (immediate) {
                    for (let i = 0; i < observable.observers.length; i++)
                        observable.observers[i](changesCopy);
                }
                else {
                    // append to microtask
                    Promise.resolve().then(() => {
                        for (let i = 0; i < observable.observers.length; i++)
                            observable.observers[i](changesCopy);
                    });
                }
            }
        };
        const handler = {
            get: function (target, property) {
                // add arr batch operate
                if (isSlimArray(target) && ARRAY_OPERATION.includes(property)) {
                    if (target[sFlag.arrOpPending]) {
                        target[sFlag.arrOpChain].push(property);
                    }
                    else {
                        setTargetValue(target, "arrOpPending", true);
                        setTargetValue(target, "arrOpChain", [property]);
                        const targetBuffer = {
                            operate: property,
                            value: [...target],
                        };
                        // avoid empty arr extract item
                        if (!(ARRAY_OPERATION_EXTRACT.includes(property) && target.length === 0) &&
                            !(property === "splice" && target.length === 0 && targetBuffer.value.length === 0)) {
                            // use microtasks to batch more changes in one for array
                            const { fullPath, itemIdPath } = _getPath(target, undefined);
                            Promise.resolve().then(() => {
                                let operationType = OperationTypeEnum.UPDATE;
                                let newValue = target;
                                let oldValue = targetBuffer.value;
                                let elementIndex;
                                const result = diffTwoArray(targetBuffer.value, target);
                                if (result.length === 1) {
                                    ({ operationType, newValue, oldValue, elementIndex } = result[0]);
                                }
                                target[sFlag.arrOpPending] = false;
                                function isSame() {
                                    return (OperationTypeEnum.SORT === operationType && JSON.stringify(newValue) === JSON.stringify(oldValue));
                                }
                                changes.push({
                                    isSame: isSame(),
                                    opChain: target[sFlag.arrOpChain],
                                    operation: property,
                                    operationType: operationType,
                                    target: target,
                                    property,
                                    newValue,
                                    oldValue,
                                    elementIndex,
                                    dotPath: fullPath,
                                    fieldIndex: itemIdPath,
                                    proxy: proxy,
                                    __slim_index: ++index,
                                });
                                _notifyObservers(undefined, true);
                            });
                        }
                    }
                }
                // implement a simple check for whether or not the object is a proxy, this helps the .create() method avoid
                // creating Proxies of Proxies.
                if (property === sFlag.getTarget) {
                    return target;
                }
                else if (property === sFlag.isProxy) {
                    return true;
                    // from the perspective of a given observable on a parent object, return the parent object of the given nested object
                }
                else if (property === sFlag.getParent) {
                    return function (i) {
                        if (typeof i === "undefined")
                            var i = 1;
                        const parentPath = _getPath(target, sFlag.getParent).fullPath.split(".");
                        parentPath.splice(-(i + 1), i + 1);
                        return _getProperty(observable.parentProxy, parentPath.join("."));
                    };
                    // return the full path of the current object relative to the parent observable
                }
                else if (property === sFlag.getPath) {
                    // strip off the 17 characters for ".__slim_getParent"
                    const parentPath = _getPath(target, sFlag.getParent).fullPath;
                    return parentPath.slice(0, -17);
                }
                // for performance improvements, we assign this to a variable so we do not have to lookup the property value again
                let targetProp = target[property];
                if (target instanceof Date && targetProp instanceof Function && targetProp !== null) {
                    return targetProp.bind(target);
                }
                // if we are traversing into a new object, then we want to record path to that object and return a new observable.
                // recursively returning a new observable allows us a single Observable.observe() to monitor all changes on
                // the target object and any objects nested within.
                if (targetProp instanceof Object && targetProp !== null && target.hasOwnProperty(property)) {
                    // if we've found a proxy nested on the object, then we want to retrieve the original object behind that proxy
                    if (targetProp[rKey("isProxy")] === true)
                        targetProp = targetProp[rKey("getTarget")];
                    // if the object accessed by the user (targetProp) already has a __slim_targetPosition AND the object
                    // stored at target[targetProp[sFlag.targetPosition]] is not null, then that means we are already observing this object
                    // we might be able to return a proxy that we've already created for the object
                    const position = targetProp[rKey("targetPosition")];
                    if (position > -1 && position !== null) {
                        // loop over the proxies that we've created for this object
                        let ttp = targetsProxy[position];
                        for (let i = 0, l = ttp.length; i < l; i++) {
                            // if we find a proxy that was setup for this particular observable, then return that proxy
                            if (observable === ttp[i].observable) {
                                return ttp[i].proxy;
                            }
                        }
                    }
                    // if we're arrived here, then that means there is no proxy for the object the user just accessed, so we
                    // have to create a new proxy for it
                    // create a shallow copy of the path array -- if we didn't create a shallow copy then all nested objects would share the same path array and the path wouldn't be accurate
                    const newPath = path.slice(0);
                    newPath.push({
                        target: targetProp,
                        property: property,
                        itemId: isSlimArray(target) ? targetProp.itemId : undefined,
                    });
                    return _create(targetProp, domDelay, observable, newPath);
                }
                else {
                    return targetProp;
                }
            },
            deleteProperty: function (target, property) {
                // was this change an original change or was it a change that was re-triggered below
                var originalChange = true;
                if (dupProxy === proxy) {
                    originalChange = false;
                    dupProxy = null;
                }
                // in order to report what the previous value was, we must make a copy of it before it is deleted
                var previousValue = Object.assign({}, target);
                // record the deletion that just took place
                if (!(target instanceof Array) || (isSlimArray(target) && !target[sFlag.arrOpPending])) {
                    const { fullPath, itemIdPath } = _getPath(target, property);
                    changes.push({
                        isSame: false,
                        property,
                        target,
                        proxy,
                        operationType: OperationTypeEnum.DELETE,
                        dotPath: fullPath,
                        fieldIndex: itemIdPath,
                        newValue: null,
                        oldValue: previousValue[property],
                        elementIndex: isArrayChange(target, property) ? property : undefined,
                        __slim_index: ++index,
                    });
                }
                if (originalChange === true) {
                    // perform the delete that we've trapped if changes are not paused for this observable
                    if (!observable.changesPaused) {
                        delete target[property];
                        if (isArray(target)) {
                            target.splice(property, 1);
                        }
                    }
                    for (var a = 0, l = targets.length; a < l; a++)
                        if (target === targets[a])
                            break;
                    // loop over each proxy and see if the target for this change has any other proxies
                    var currentTargetProxy = targetsProxy[a] || [];
                    var b = currentTargetProxy.length;
                    while (b--) {
                        // if the same target has a different proxy
                        if (currentTargetProxy[b].proxy !== proxy) {
                            // !!IMPORTANT!! store the proxy as a duplicate proxy (dupProxy) -- this will adjust the behavior above appropriately (that is,
                            // prevent a change on dupProxy from re-triggering the same change on other proxies)
                            dupProxy = currentTargetProxy[b].proxy;
                            // make the same delete on the different proxy for the same target object. it is important that we make this change *after* we invoke the same change
                            // on any other proxies so that the previousValue can show up correct for the other proxies
                            delete currentTargetProxy[b].proxy[property];
                        }
                    }
                }
                _notifyObservers(changes.length);
                return true;
            },
            set: function (target, property, value, receiver) {
                // if the value we're assigning is an object, then we want to ensure
                // that we're assigning the original object, not the proxy, in order to avoid mixing
                // the actual targets and proxies -- creates issues with path logging if we don't do this
                if (value && value[sFlag.isProxy])
                    value = value[sFlag.getTarget];
                // was this change an original change or was it a change that was re-triggered below
                var originalChange = true;
                if (dupProxy === proxy) {
                    originalChange = false;
                    dupProxy = null;
                }
                // improve performance by saving direct references to the property
                var targetProp = target[property];
                // Only record this change if:
                // 	1. the new value differs from the old one
                //	2. OR if this proxy was not the original proxy to receive the change
                // 	3. OR the modified target is an array and the modified property is "length" and our helper property __slim_length indicates that the array length has changed
                //
                // Regarding #3 above: mutations of arrays via .push or .splice actually modify the .length before the set handler is invoked
                // so in order to accurately report the correct previousValue for the .length, we have to use a helper property.
                if (targetProp !== value ||
                    originalChange === false ||
                    (property === "length" && isSlimArray(target) && target[sFlag.length] !== value)) {
                    var foundObservable = true;
                    var typeOfTargetProp = typeof targetProp;
                    // determine if we're adding something new or modifying some that already existed
                    let type = OperationTypeEnum.UPDATE;
                    if (typeOfTargetProp === "undefined")
                        type = OperationTypeEnum.NEW;
                    // store the change that just occurred. it is important that we store the change before invoking the other proxies so that the previousValue is correct
                    if (!(target instanceof Array) || (isSlimArray(target) && !target[sFlag.arrOpPending])) {
                        const { fullPath, itemIdPath } = _getPath(target, property);
                        changes.push({
                            isSame: false,
                            property,
                            target,
                            proxy,
                            operationType: type,
                            dotPath: fullPath,
                            fieldIndex: itemIdPath,
                            newValue: value,
                            oldValue: receiver[property],
                            elementIndex: isArrayChange(target, property) ? property : undefined,
                            __slim_index: ++index,
                        });
                    }
                    // mutations of arrays via .push or .splice actually modify the .length before the set handler is invoked
                    // so in order to accurately report the correct previousValue for the .length, we have to use a helper property.
                    if (property === "length" && isSlimArray(target) && target[sFlag.length] !== value) {
                        // changes[changes.length-1].previousValue = target[sFlag.length];
                        target[sFlag.length] = value;
                    }
                    // !!IMPORTANT!! if this proxy was the first proxy to receive the change, then we need to go check and see
                    // if there are other proxies for the same project. if there are, then we will modify those proxies as well so the other
                    // observers can be modified of the change that has occurred.
                    if (originalChange === true) {
                        // because the value actually differs than the previous value
                        // we need to store the new value on the original target object,
                        // but only as long as changes have not been paused
                        if (!observable.changesPaused)
                            target[property] = value;
                        foundObservable = false;
                        var targetPosition = target[sFlag.targetPosition];
                        var z = targetsProxy[targetPosition].length;
                        // find the parent target for this observable -- if the target for that observable has not been removed
                        // from the targets array, then that means the observable is still active and we should notify the observers of this change
                        while (z--) {
                            if (observable === targetsProxy[targetPosition][z].observable) {
                                if (targets[targetsProxy[targetPosition][z].observable.parentTarget[sFlag.targetPosition]] !== null) {
                                    foundObservable = true;
                                    break;
                                }
                            }
                        }
                        // if we didn't find an observable for this proxy, then that means .remove(proxy) was likely invoked
                        // so we no longer need to notify any observer function about the changes, but we still need to update the
                        // value of the underlying original objects see below: target[property] = value;
                        if (foundObservable) {
                            // loop over each proxy and see if the target for this change has any other proxies
                            var currentTargetProxy = targetsProxy[targetPosition];
                            for (var b = 0, l = currentTargetProxy.length; b < l; b++) {
                                // if the same target has a different proxy
                                if (currentTargetProxy[b].proxy !== proxy) {
                                    // !!IMPORTANT!! store the proxy as a duplicate proxy (dupProxy) -- this will adjust the behavior above appropriately (that is,
                                    // prevent a change on dupProxy from re-triggering the same change on other proxies)
                                    dupProxy = currentTargetProxy[b].proxy;
                                    // invoke the same change on the different proxy for the same target object. it is important that we make this change *after* we invoke the same change
                                    // on any other proxies so that the previousValue can show up correct for the other proxies
                                    currentTargetProxy[b].proxy[property] = value;
                                }
                            }
                            // if the property being overwritten is an object, then that means this observable
                            // will need to stop monitoring this object and any nested objects underneath the overwritten object else they'll become
                            // orphaned and grow memory usage. we execute this on a setTimeout so that the clean-up process does not block
                            // the UI rendering -- there's no need to execute the clean up immediately
                            setTimeout(function () {
                                if (typeOfTargetProp === "object" && targetProp !== null) {
                                    // check if the to-be-overwritten target property still exists on the target object
                                    // if it does still exist on the object, then we don't want to stop observing it. this resolves
                                    // an issue where array .sort() triggers objects to be overwritten, but instead of being overwritten
                                    // and discarded, they are shuffled to a new position in the array
                                    var keys = Object.keys(target);
                                    for (var i = 0, l = keys.length; i < l; i++) {
                                        if (target[keys[i]] === targetProp)
                                            return;
                                    }
                                    var stillExists = false;
                                    // now we perform the more expensive search recursively through the target object.
                                    // if we find the targetProp (that was just overwritten) still exists somewhere else
                                    // further down in the object, then we still need to observe the targetProp on this observable.
                                    (function iterate(target) {
                                        var keys = Object.keys(target);
                                        for (var i = 0, l = keys.length; i < l; i++) {
                                            var property = keys[i];
                                            var nestedTarget = target[property];
                                            if (nestedTarget instanceof Object && nestedTarget !== null)
                                                iterate(nestedTarget);
                                            if (nestedTarget === targetProp) {
                                                stillExists = true;
                                                return;
                                            }
                                        }
                                    })(target);
                                    // even though targetProp was overwritten, if it still exists somewhere else on the object,
                                    // then we don't want to remove the observable for that object (targetProp)
                                    if (stillExists === true)
                                        return;
                                    // loop over each property and recursively invoke the `iterate` function for any
                                    // objects nested on targetProp
                                    (function iterate(obj) {
                                        var keys = Object.keys(obj);
                                        for (var i = 0, l = keys.length; i < l; i++) {
                                            var objProp = obj[keys[i]];
                                            if (objProp instanceof Object && objProp !== null)
                                                iterate(objProp);
                                        }
                                        // if there are any existing target objects (objects that we're already observing)...
                                        var c = -1;
                                        for (var i = 0, l = targets.length; i < l; i++) {
                                            if (obj === targets[i]) {
                                                c = i;
                                                break;
                                            }
                                        }
                                        if (c > -1) {
                                            // ...then we want to determine if the observables for that object match our current observable
                                            var currentTargetProxy = targetsProxy[c];
                                            var d = currentTargetProxy.length;
                                            while (d--) {
                                                // if we do have an observable monitoring the object thats about to be overwritten
                                                // then we can remove that observable from the target object
                                                if (observable === currentTargetProxy[d].observable) {
                                                    currentTargetProxy.splice(d, 1);
                                                    break;
                                                }
                                            }
                                            // if there are no more observables assigned to the target object, then we can remove
                                            // the target object altogether. this is necessary to prevent growing memory consumption particularly with large data sets
                                            if (currentTargetProxy.length == 0) {
                                                // targetsProxy.splice(c,1);
                                                targets[c] = null;
                                            }
                                        }
                                    })(targetProp);
                                }
                            }, 10000);
                        }
                        // TO DO: the next block of code resolves test case #29, but it results in poor IE11 performance with very large objects.
                        // UPDATE: need to re-evaluate IE11 performance due to major performance overhaul from 12/23/2018.
                        //
                        // if the value we've just set is an object, then we'll need to iterate over it in order to initialize the
                        // observers/proxies on all nested children of the object
                        /* if (value instanceof Object && value !== null) {
                                          (function iterate(proxy) {
                                              var target = proxy[sFlag.getTarget];
                                              var keys = Object.keys(target);
                                              for (var i = 0, l = keys.length; i < l; i++) {
                                                  var property = keys[i];
                                                  if (target[property] instanceof Object && target[property] !== null) iterate(proxy[property]);
                                              };
                                          })(proxy[property]);
                                      }; */
                    }
                    if (foundObservable) {
                        // notify the observer functions that the target has been modified
                        _notifyObservers(changes.length);
                    }
                }
                return true;
            },
        };
        const tPosition = target[sFlag.targetPosition];
        if (!(tPosition > -1)) {
            Object.defineProperty(target, sFlag.targetPosition, {
                value: targets.length,
                writable: false,
                enumerable: false,
                configurable: false,
            });
        }
        // create the proxy that we'll use to observe any changes
        const proxy = new Proxy(target, handler);
        // we don't want to create a new observable if this function was invoked recursively
        if (observable === null) {
            observable = {
                parentTarget: target,
                domDelay: domDelay,
                parentProxy: proxy,
                observers: [],
                paused: false,
                path: path,
                changesPaused: false,
            };
            observables.push(observable);
        }
        // store the proxy we've created so it isn't re-created unnecessarily via get handler
        const proxyItem = { target: target, proxy: proxy, observable: observable };
        // if we have already created a Proxy for this target object then we add it to the corresponding array
        // on targetsProxy (targets and targetsProxy work together as a Hash table indexed by the actual target object).
        if (tPosition > -1) {
            // the targets array is set to null for the position of this particular object, then we know that
            // the observable was removed some point in time for this object -- so we need to set the reference again
            if (targets[tPosition] === null) {
                targets[tPosition] = target;
            }
            targetsProxy[tPosition].push(proxyItem);
            // else this is a target object that we had not yet created a Proxy for, so we must add it to targets,
            // and push a new array on to targetsProxy containing the new Proxy
        }
        else {
            targets.push(target);
            targetsProxy.push([proxyItem]);
        }
        return proxy;
    };
    /**
     * @typedef {object} ObservableSlimChange Observed change.
     * @property {"add"|"update"|"delete"} type Change type.
     * @property {string} property Property name.
     * @property {string} currentPath Property path with the dot notation (e.g. `foo.0.bar`).
     * @property {string} jsonPointer Property path with the JSON pointer syntax (e.g. `/foo/0/bar`). See https://datatracker.ietf.org/doc/html/rfc6901.
     * @property {object} target Target object.
     * @property {ProxyConstructor} proxy Proxy of the target object.
     * @property {*} newValue New value of the property.
     * @property {*} [previousValue] Previous value of the property
     */
    /**
     * Create a new ES6 `Proxy` whose changes we can observe through the `observe()` method.
     * @param {object} target Plain object that we want to observe for changes.
     * @param {boolean|number} domDelay If `true`, then the observed changes to `target` will be batched up on a 10ms delay (via `setTimeout()`).
     * If `false`, then the `observer` function will be immediately invoked after each individual change made to `target`. It is helpful to set
     * `domDelay` to `true` when your `observer` function makes DOM manipulations (fewer DOM redraws means better performance). If a number greater
     * than zero, then it defines the DOM delay in milliseconds.
     * @param {function(ObservableSlimChange[])} [observer] Function that will be invoked when a change is made to the proxy of `target`.
     * When invoked, this function is passed a single argument: an array of `ObservableSlimChange` detailing each change that has been made.
     * @returns {ProxyConstructor} Proxy of the target object.
     */
    const create = function (targetIn, domDelay, observer) {
        // test if the target is a Proxy, if it is then we need to retrieve the original object behind the Proxy.
        // we do not allow creating proxies of proxies because -- given the recursive design of ObservableSlim -- it would lead to sharp increases in memory usage
        let target = targetIn;
        if (target[sFlag.isProxy] === true) {
            target = target[sFlag.getTarget];
            //if it is, then we should throw an error. we do not allow creating proxies of proxies
            // because -- given the recursive design of ObservableSlim -- it would lead to sharp increases in memory usage
            //throw new Error("ObservableSlim.create() cannot create a Proxy for a target object that is also a Proxy.");
        }
        // fire off the _create() method -- it will create a new observable and proxy and return the proxy
        const proxy = _create(target, domDelay);
        // assign the observer function
        if (typeof observer === "function")
            observe(proxy, observer);
        // recursively loop over all nested objects on the proxy we've just created
        // this will allow the top observable to observe any changes that occur on a nested object
        (function iterate(proxy) {
            const target = proxy[sFlag.getTarget];
            const keys = Object.keys(target);
            for (let i = 0, l = keys.length; i < l; i++) {
                const property = keys[i];
                if (target[property] instanceof Object && target[property] !== null)
                    iterate(proxy[property]);
            }
        })(proxy);
        return proxy;
    };
    /**
     * Add a new observer function to an existing proxy.
     * @param {ProxyConstructor} proxy An ES6 `Proxy` created by the `create()` method.
     * @param {function(ObservableSlimChange[])} observer Function that will be invoked when a change is made to the proxy of `target`.
     * When invoked, this function is passed a single argument: an array of `ObservableSlimChange` detailing each change that has been made.
     * @returns {void} Does not return any value.
     */
    const observe = function (proxy, observer) {
        // loop over all the observables created by the _create() function
        var i = observables.length;
        while (i--) {
            if (observables[i].parentProxy === proxy) {
                observables[i].observers.push(observer);
                break;
            }
        }
    };
    /**
     * Prevent any observer functions from being invoked when a change occurs to a proxy.
     * @param {ProxyConstructor} proxy An ES6 `Proxy` created by the `create()` method.
     * @returns {void} Does not return any value.
     */
    const pause = function (proxy) {
        var i = observables.length;
        var foundMatch = false;
        while (i--) {
            if (observables[i].parentProxy === proxy) {
                observables[i].paused = true;
                foundMatch = true;
                break;
            }
        }
        if (foundMatch == false)
            throw new Error("ObseravableSlim could not pause observable -- matching proxy not found.");
    };
    /**
     * Resume execution of any observer functions when a change is made to a proxy.
     * @param {ProxyConstructor} proxy An ES6 `Proxy` created by the `create()` method.
     * @returns {void} Does not return any value.
     */
    const resume = function (proxy) {
        var i = observables.length;
        var foundMatch = false;
        while (i--) {
            if (observables[i].parentProxy === proxy) {
                observables[i].paused = false;
                foundMatch = true;
                break;
            }
        }
        if (foundMatch == false)
            throw new Error("ObseravableSlim could not resume observable -- matching proxy not found.");
    };
    /**
     * Prevent any changes (i.e., `set`, and `deleteProperty`) from being written to the target object.
     * However, the observer functions will still be invoked to let you know what changes **WOULD** have been made.
     * This can be useful if the changes need to be approved by an external source before the changes take effect.
     * @param {ProxyConstructor} proxy An ES6 `Proxy` created by the `create()` method.
     * @returns {void} Does not return any value.
     */
    const pauseChanges = function (proxy) {
        var i = observables.length;
        var foundMatch = false;
        while (i--) {
            if (observables[i].parentProxy === proxy) {
                observables[i].changesPaused = true;
                foundMatch = true;
                break;
            }
        }
        if (foundMatch == false)
            throw new Error("ObseravableSlim could not pause changes on observable -- matching proxy not found.");
    };
    /**
     * Resume the changes that were taking place prior to the call to `pauseChanges()` method.
     * @param {ProxyConstructor} proxy An ES6 `Proxy` created by the `create()` method.
     * @returns {void} Does not return any value.
     */
    const resumeChanges = function (proxy) {
        var i = observables.length;
        var foundMatch = false;
        while (i--) {
            if (observables[i].parentProxy === proxy) {
                observables[i].changesPaused = false;
                foundMatch = true;
                break;
            }
        }
        if (foundMatch == false)
            throw new Error("ObseravableSlim could not resume changes on observable -- matching proxy not found.");
    };
    /**
     * Remove the observable and proxy thereby preventing any further callback observers for changes occurring to the target object.
     * @param {ProxyConstructor} proxy An ES6 `Proxy` created by the `create()` method.
     * @returns {void} Does not return any value.
     */
    const remove = function (proxy) {
        var matchedObservable = null;
        var foundMatch = false;
        var c = observables.length;
        while (c--) {
            if (observables[c].parentProxy === proxy) {
                matchedObservable = observables[c];
                foundMatch = true;
                break;
            }
        }
        var a = targetsProxy.length;
        while (a--) {
            var b = targetsProxy[a].length;
            while (b--) {
                if (targetsProxy[a][b].observable === matchedObservable) {
                    targetsProxy[a].splice(b, 1);
                    // if there are no more proxies for this target object
                    // then we null out the position for this object on the targets array
                    // since we are essentially no longer observing this object.
                    // we do not splice it off the targets array, because if we re-observe the same
                    // object at a later time, the property __slim_targetPosition cannot be redefined.
                    if (targetsProxy[a].length === 0) {
                        targets[a] = null;
                    }
                }
            }
        }
        if (foundMatch === true) {
            observables.splice(c, 1);
        }
    };
    var index$1 = {
        create,
        pause,
        remove,
        resume,
        resumeChanges,
        pauseChanges,
        observe,
    };

    exports.ARRAY_OPERATION = ARRAY_OPERATION;
    exports.ARRAY_OPERATION_ADD = ARRAY_OPERATION_ADD;
    exports.ARRAY_OPERATION_EXTRACT = ARRAY_OPERATION_EXTRACT;
    exports.SLIM_KEYS = SLIM_KEYS;
    exports.create = create;
    exports.default = index$1;
    exports.isArrayChange = isArrayChange;
    exports.isSlimArray = isSlimArray;
    exports.observe = observe;
    exports.pause = pause;
    exports.pauseChanges = pauseChanges;
    exports.rKey = rKey;
    exports.remove = remove;
    exports.resume = resume;
    exports.resumeChanges = resumeChanges;
    exports.sFlag = sFlag;
    exports.setTargetValue = setTargetValue;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
