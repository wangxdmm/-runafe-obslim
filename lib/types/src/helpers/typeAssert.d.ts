export declare function getType(source: any): string;
export declare function isArray<T>(x: any): x is Array<T>;
export declare function isString(x: any): x is string;
export declare function isNumber(x: any): x is number;
export declare function isFunction(x: any): x is (...args: any[]) => any;
export declare function isRegExp(x: any): x is RegExp;
export declare function isUndef(x: any): x is undefined | null;
export declare function isDef<T = any>(x: T): x is NonNullable<T>;
export declare function notEmpty(x: any): boolean;
export declare function isObject<T = object>(x: any): x is T;
export declare function isEmptyObject(x: any): boolean;
export declare function isNumberPlus(x: any): x is number;
export declare function isPromise<T = any>(x: any): x is Promise<T>;
export declare function isValidArrIndex<T = number>(x: any): x is T;
export declare function isServer(): boolean;
//# sourceMappingURL=typeAssert.d.ts.map