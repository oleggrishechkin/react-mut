# React Mut

[![NPM version](https://img.shields.io/npm/v/react-mut.svg?style=flat)](https://www.npmjs.com/package/react-mut)
[![Package size](https://img.shields.io/bundlephobia/minzip/react-mut.svg)](https://bundlephobia.com/result?p=react-mut)
![typescript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)
![NPM license](https://img.shields.io/npm/l/react-mut.svg?style=flat)
[![NPM total downloads](https://img.shields.io/npm/dt/react-mut.svg?style=flat)](https://npmcharts.com/compare/react-mut?minimal=true)
[![NPM monthly downloads](https://img.shields.io/npm/dm/react-mut.svg?style=flat)](https://npmcharts.com/compare/react-mut?minimal=true)

🔗 Subscribe component to any object.

Click [here](https://codesandbox.io/s/react-mut-vguu9j) to see sandbox.

## Basics

Subscribe with `useMut` → Mutate object → Notify subscribers with `mut`

```typescript jsx
import { mut, useMut } from 'react-mut';

const mutableObject = { title: 'title' };

const Component = () => {
  // subscribe
  useMut(mutableObject);

  return (
    <button
      onClick={() => {
        // mutate and notify subscribers
        mut(mutableObject).title = 'next title';
      }}
    >
      {mutableObject.title}
    </button>
  );
};
```

## Mutations

You can mark objects as mutated with `mut`.<br>
You can call `mut` anytime (before mutation and after mutation).

```typescript jsx
import { mut } from 'react-mut';

const mutableObject = { title: 'title'};

// before mutation:
mut(mutableObject).title = 'next title';

// or after mutation:
mutableObject.title = 'next title';
mut(mutableObject);

// this will work too:
Object.assign(mut(mutableObject), {
  title: 'next title'
});
```

Notifying subscribers scheduled via microtask.<br>
But you can immediately notify subscribers with `sync`.<br>
It can be useful for tests, for example.

```typescript jsx
import { sync } from 'react-mut';

const mutableObject = { title: 'title'};

const action = () => {
    mut(mutableObject).title = 'next title';

    // immediately notify subscribers
    sync();
};

```

## Versions

When you call `mut` with object, object's version updated.<br>
You can read object's version with `ver`.<br>
It can be useful for hook's dependencies, for example.

```typescript jsx
import { mut, useMut } from 'react-mut';

const mutableObject = { title: 'title' };

const Component = () => {
  useMut(mutableObject);

  useEffect(() => {
    // Will be logged on button below click
    console.log(mutableObject);
  }, [ver(mutableObject)]);

  return (
    <button
      onClick={() => {
        mut(mutableObject).title = 'next title';
      }}
    >
      {mutableObject.title}
    </button>
  );
};
```

## Subscriptions

You can subscribe to object with `sub`.<br>
You can unsubscribe from object with returned callback.

```typescript jsx
import { sub, mut } from 'react-mut';

const mutableObject = { title: 'title' };

const unsubscribe = sub(mutableObject, () => {
  // will be logged on mutableObject's version change.
  console.log(mutableObject);
});

unsubscribe();
```

You also can unsubscribe from object with `unsub`.<br>
You can unsubscribe all from object with `unsub` without callback.

```typescript jsx
import { unsub, sub, mut } from 'react-mut';

const mutableObject = { title: 'title' };

const callback = () => {
    // will be logged on mutableObject's version change.
    console.log(mutableObject);
}

// subscribe callback to mutableObject
sub(mutableObject, callback);

// unsubscribe callback from mutableObject
unsub(mutableObject, callback);

// subscribe anonymus callback to mutableObject
sub(mutableObject, () => {
    console.log(mutableObject);
});
// unsubscribe all callbacks from mutableObject
unsub(mutableObject);
```

## Hooks

You can use `useMut` to subscribe component to object.<br>
Component will be re-rendered after `mut` call with object.

```typescript jsx
import { mut, useMut } from 'react-mut';

const mutableObject = { title: 'title' };

// Will be re-rendered on mutableObject's version change
const Component = () => {
  const mutableObject = useMut(mutableObject);

  return <div>{mutableObject.title}</div>;
};
```

You can use selectors with `useSel` to optimize re-renders.<br>
Selector will be called after `mut` call with **any** object.<br>
Component will be re-rendered if selected value changed.

```typescript jsx
import { mut, useSel } from 'react-mut';

const mutableObject = { title: 'title' };

// Will be re-rendered on mutableObject.title change
const Component = () => {
  const title = useSel(() => mutableObject.title);

  return <div>{title}</div>;
};
```

Also, you can use `useMutSel` for subscribing to nested mutable objects.
Selector will be called after `mut` call with **any** object.<br>
It's alias for `useMut(useSel(...))`;

```typescript jsx
import { mut, useMutSel } from 'react-mut';

const items = [{ title: 'title' }];

// Will be re-rendered on items[0]'s version change
const Component = () => {
  const item = useMutSel(() => items[0]);

  return <div>{item.title}</div>;
};
```
