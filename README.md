# Fork of [observable-slim](https://github.com/elliotnb/observable-slim)

## purpose

For version control of our own low code platform based on `vue3`

## changes

- refactor with Typescript

- batch array changes into one
  - if array operation is oneof `push`, `pop`, `unshift`, `shift`, `splice`, we always want the final array and initial array, unfortunately, `observable-slim` based on `Proxy` always invoke many changs like `array.0`, `array.1`, `array.length` which we don't care anymore, so, I delay pushing change by add it to `Microtasks` by `Promise.resolve`
  - a batch of operatione should generate one change

``` javascript
const app = [
  {
    itemId: "appOne",
    code: 1,
    name: 2,
    array1: [
      { itemId: 11, name: "1-1" },
      { itemId: 22, name: "1-2" },
    ],
  },
];

const appProxy = ObservableSlim.create(app, false, (change) => {
  if (change.length) {
    console.log("change", change[0]);
  }
});
const [app] = appReactive;
app.array1.reverse();
app.array1.reverse();
app.array1[0].name = "1-1-2";
app.array1.splice(0, 0, { name: "1-3", itemId: ++index });
delete app.array1[0];
// should not generate change
```

- add `__slim` prefix to all private key added by `observable-slim`, like `__length`, `__isProxy`, `__getPath`
- change some key for our own project to use

```typescript
export interface Change {
  operateChain?: string[];
  operationType: OperationTypeEnum;
  operation?: ArrayOperation | string;
  newValue: any;
  oldValue: any;
  target: any;
  proxy: any;
  dotPath: string;
  fieldIndex: string; // itemIdPath
  property: string;
  elementIndex?: number;
  __slim_index: number;
}
```

- add `__slim_index` flag for sorting changes
- add more `types` for TS
