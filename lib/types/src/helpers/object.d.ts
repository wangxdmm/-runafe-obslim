declare type TransMap<T, K extends keyof T> = Record<K, {
    alterVal: ((val: T[K]) => T[K]) | T[K];
    when?: (val: T[K]) => boolean;
}>;
export declare function transAttr<T extends Record<string, any>, K extends keyof T>(obj: T, maps: TransMap<T, K>): T;
export declare function toHash<T>(arr: Array<T>, path: string[] | string): Record<string, T>;
export {};
//# sourceMappingURL=object.d.ts.map