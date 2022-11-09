export declare type PartialVersion = Partial<any>;
export declare enum OperationTypeEnum {
    NEW = "NEW",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
    SORT = "SORT"
}
export declare function diffTwoArray(origin: any[], newArr: any[], config?: {
    flag: "itemId";
    otherMes?: () => PartialVersion;
}): PartialVersion[];
//# sourceMappingURL=diff.d.ts.map