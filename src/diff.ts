export type PartialVersion = Partial<any>;

export enum OperationTypeEnum {
  NEW = "NEW",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  SORT = "SORT",
}

export function diffTwoArray(
  origin: any[],
  newArr: any[],
  config?: {
    flag: "itemId";
    otherMes?: () => PartialVersion;
  }
): PartialVersion[] {
  const { flag, otherMes } = Object.assign({ flag: "itemId", otherMes: () => ({}) }, config || {});
  const originFlagArr = origin.map((i) => i[flag]);
  const newArrFlagArr = newArr.map((i) => i[flag]);

  const addItem: PartialVersion[] = [];
  const deleteItem: PartialVersion[] = [];

  originFlagArr.forEach((i, index) => {
    if (!newArrFlagArr.includes(i)) {
      deleteItem.push({
        operationType: OperationTypeEnum.DELETE,
        elementIndex: index - deleteItem.length, // delete should update originArr.length
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
