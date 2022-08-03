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

```javascript
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

You can mark objects as mutated via `mut`.<br>
You can call `mut` anytime (before mutation and after mutation).

```javascript
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

You can use `flush` to await mut microtask.<br>
It can be useful for tests, for example.

```javascript
import { flush } from 'react-mut';

const mutableObject = { title: 'title'};

const action = async () => {
    mut(mutableObject).title = 'next title';

    // await mut microtask
    await flush();
};

```

## Versions

When you call `mut` with object, object's version will be updated.<br>
You can read object's version with `ver`.<br>
It's useful for hook's dependencies.

```javascript
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

You can subscribe to object with `sub`.

```javascript
import { sub, mut } from 'react-mut';

const mutableObject = { title: 'title' };

const unsubscribe = sub(mutableObject, () => {
  // will be logged on mutableObject's version change.
  console.log(mutableObject);
});

unsubscribe();
```

You also can unsubscribe from object with `unsub`

```javascript
import { unsub, sub, mut } from 'react-mut';

const mutableObject = { title: 'title' };

const callback = () => {
    // will be logged on mutableObject's version change.
    console.log(mutableObject);
}

sub(mutableObject, callback);

unsub(mutableObject, callback);
```

## Hooks

You can use `useMut` to subscribe component to object.

```javascript
import { mut, useMut } from 'react-mut';

const mutableObject = { title: 'title' };

// Will be re-rendered on mutableObject's version change
const Component = () => {
  const mutableObject = useMut(mutableObject);

  return <div>{mutableObject.title}</div>;
};
```

You can use selectors with `useSel` to optimize re-renders.

```javascript
import { mut, useSel } from 'react-mut';

const mutableObject = { title: 'title' };

// Will be re-rendered on mutableObject.title change
const Component = () => {
  const title = useSel(() => mutableObject.title);

  return <div>{title}</div>;
};
```

Also, you can use `useMutSel` for subscribing to nested mutable objects.

```javascript
import { mut, useMutSel } from 'react-mut';

const items = [{ title: 'title' }];

// Will be re-rendered on items[0]'s version change
const Component = () => {
  const item = useMutSel(() => items[0]);

  return <div>{item.title}</div>;
};
```
