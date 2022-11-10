import { OperationTypeEnum } from "./diff";
declare const SLIM_PREFIX = "__slim_";
export declare const SLIM_KEYS: readonly ["length", "arrOpPending", "isProxy", "getTarget", "getParent", "getPath", "targetPosition", "arrOpChain"];
export declare type SlimKeys = typeof SLIM_KEYS[number];
export declare const sFlag: {
    length: "__slim_length";
    arrOpPending: "__slim_arrOpPending";
    isProxy: "__slim_isProxy";
    getTarget: "__slim_getTarget";
    getParent: "__slim_getParent";
    getPath: "__slim_getPath";
    targetPosition: "__slim_targetPosition";
    arrOpChain: "__slim_arrOpChain";
};
export declare type SlimKey<T extends SlimKeys> = `${typeof SLIM_PREFIX}${T}`;
export declare function rKey<T extends SlimKeys>(x: T): SlimKey<T>;
export interface SlimReserveFlags {
    [sFlag.length]: number;
    [sFlag.arrOpPending]: boolean;
    [sFlag.isProxy]: boolean;
    [sFlag.getTarget]: any;
    [sFlag.getParent]: any;
    [sFlag.getPath]: string;
    [sFlag.targetPosition]: number;
    [sFlag.arrOpChain]: string[];
}
export declare function setTargetValue<T extends SlimReserveFlags>(target: T, key: SlimKeys, value: any): void;
export declare type CombineSlimReserveFlags<T> = T & SlimReserveFlags;
export declare type SlimArray = any[] & SlimReserveFlags;
export interface SlimObject extends SlimReserveFlags {
    [k: string]: any;
}
export interface PathMeta {
    target: any;
    property: number | string;
    itemId?: string;
}
export declare function isSlimArray(x: any): x is SlimArray;
export declare const ARRAY_OPERATION_EXTRACT: readonly ["shift", "pop"];
export declare const ARRAY_OPERATION_ADD: readonly ["push", "unshift"];
export declare const ARRAY_OPERATION: readonly ["shift", "pop", "push", "unshift", "splice", "reverse"];
export declare type ArrayOperation = typeof ARRAY_OPERATION[number];
export interface Change {
    isSame: boolean;
    opChain?: string[];
    operateChain?: string[];
    operationType: OperationTypeEnum;
    operation?: ArrayOperation | string;
    newValue: any;
    oldValue: any;
    target: any;
    proxy: any;
    dotPath: string;
    fieldIndex: string;
    property: string;
    elementIndex?: number;
    __slim_index: number;
}
export declare function isArrayChange(target: any, property: string | number): boolean;
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
export declare const create: <T>(targetIn: T, domDelay: any, observer: (change: Change[]) => void) => T;
/**
 * Add a new observer function to an existing proxy.
 * @param {ProxyConstructor} proxy An ES6 `Proxy` created by the `create()` method.
 * @param {function(ObservableSlimChange[])} observer Function that will be invoked when a change is made to the proxy of `target`.
 * When invoked, this function is passed a single argument: an array of `ObservableSlimChange` detailing each change that has been made.
 * @returns {void} Does not return any value.
 */
export declare const observe: (proxy: any, observer: any) => void;
/**
 * Prevent any observer functions from being invoked when a change occurs to a proxy.
 * @param {ProxyConstructor} proxy An ES6 `Proxy` created by the `create()` method.
 * @returns {void} Does not return any value.
 */
export declare const pause: (proxy: any) => void;
/**
 * Resume execution of any observer functions when a change is made to a proxy.
 * @param {ProxyConstructor} proxy An ES6 `Proxy` created by the `create()` method.
 * @returns {void} Does not return any value.
 */
export declare const resume: (proxy: any) => void;
/**
 * Prevent any changes (i.e., `set`, and `deleteProperty`) from being written to the target object.
 * However, the observer functions will still be invoked to let you know what changes **WOULD** have been made.
 * This can be useful if the changes need to be approved by an external source before the changes take effect.
 * @param {ProxyConstructor} proxy An ES6 `Proxy` created by the `create()` method.
 * @returns {void} Does not return any value.
 */
export declare const pauseChanges: (proxy: any) => void;
/**
 * Resume the changes that were taking place prior to the call to `pauseChanges()` method.
 * @param {ProxyConstructor} proxy An ES6 `Proxy` created by the `create()` method.
 * @returns {void} Does not return any value.
 */
export declare const resumeChanges: (proxy: any) => void;
/**
 * Remove the observable and proxy thereby preventing any further callback observers for changes occurring to the target object.
 * @param {ProxyConstructor} proxy An ES6 `Proxy` created by the `create()` method.
 * @returns {void} Does not return any value.
 */
export declare const remove: (proxy: any) => void;
declare const _default: {
    create: <T>(targetIn: T, domDelay: any, observer: (change: Change[]) => void) => T;
    pause: (proxy: any) => void;
    remove: (proxy: any) => void;
    resume: (proxy: any) => void;
    resumeChanges: (proxy: any) => void;
    pauseChanges: (proxy: any) => void;
    observe: (proxy: any, observer: any) => void;
};
export default _default;
//# sourceMappingURL=index.d.ts.map