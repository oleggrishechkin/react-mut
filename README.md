# React Mut

[![NPM version](https://img.shields.io/npm/v/react-mut.svg?style=flat)](https://www.npmjs.com/package/react-mut)
[![Package size](https://img.shields.io/bundlephobia/minzip/react-mut.svg)](https://bundlephobia.com/result?p=react-mut)
![typescript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)
![NPM license](https://img.shields.io/npm/l/react-mut.svg?style=flat)
[![NPM total downloads](https://img.shields.io/npm/dt/react-mut.svg?style=flat)](https://npmcharts.com/compare/react-mut?minimal=true)
[![NPM monthly downloads](https://img.shields.io/npm/dm/react-mut.svg?style=flat)](https://npmcharts.com/compare/react-mut?minimal=true)

🔗 Subscribe components to any object.

## Basics

Subscribe with `useMut` → Mutate object → Notify subscribers with `mut`

```javascript
import { mut, useMut } from 'react-mut';

// any object or function (arrays, maps, sets, etc.)
const mutableObject = { title: 'title' };

const Component = () => {
  // subscribe to `mutableObject`
  useMut(mutableObject);

  return (
    <button
      onClick={() => {
        // notify `mutableObject` subscribers
        mut(mutableObject).title = 'next title';
      }}
    >
      {mutableObject.title}
    </button>
  );
};
```

## Batching

`mut` is batched. Notify is scheduled via microtask. So you can call `mut` anytime (before mutation or after mutation).

```javascript
import { mut } from 'react-mut';

const mutableObject = {
  title: 'title',
  description: 'description'
};

// before mutation:
mut(mutableObject).title = 'next title';
mut(mutableObject).description =
  'next description';

// or after mutation:
mutableObject.title = 'next title';
mut(mutableObject);

// this will work too:
Object.assign(mut(mutableObject), {
  title: 'next title'
});
```

## Props

You can use objects from props with `useMut`.

```javascript
import { mut, useMut } from 'react-mut';

const items = [{ name: 'name' }];

const Item = ({ data }) => {
  useMut(data);

  return <div>{data.name}</div>;
};

const List = () => {
  useMut(items);

  return items.map((item) => (
    <Item data={item} />
  ));
};

// first Item will be re-rendered but List will not.
mut(items[0]).name = 'next name';
```

## Subscriptions

You can manually subscribe to object with `sub`.

```javascript
import { sub, mut } from 'react-mut';

const mutableObject = {
  title: 'title',
  description: 'description'
};

// subscribe
sub(mutableObject, () => {
  // will be logged after `mut` call with `mutableObject`.
  console.log(mutableObject);
});

mut(mutableObject).title = 'next title';
```

## Versions

When you call `mut` with object and object has subscribers, object version will be updated. Version will be deleted if object has no subscribers. Version is empty object or object itself. You can read object current version by calling `ver` with this object.

```javascript
import { mut, useMut } from 'react-mut';

const mutableObject = { title: 'title' };

const Component = () => {
  useMut(mutableObject);

  // version can be used as dependency
  useEffect(() => {
    console.log(mutableObject);
  }, [ver(mutableObject)]);

  return (
    <button
      onClick={() => {
        // `mutableObject` version will be updated
        mut(mutableObject).title = 'next title';
      }}
    >
      {mutableObject.title}
    </button>
  );
};
```

## Selectors

You can use selectors via `useSel` to optimize re-renders. You should mark mutable objects by `use`.

```javascript
import { mut, use, useSel } from 'react-mut';

const mutableObject = { title: 'title' };

const Component = () => {
  // Subscribe to mutableObject.title change
  const title = useSel(() => use(mutableObject).title);

  return <div>{title}</div>;
};
```

Please, be careful with subscribing to nested mutable objects. You should use a selector and mark all mutable object parents.

Bad:

```javascript
import { mut, useMut } from 'react-mut';

const items = [{ title: 'title' }];

const Component = () => {
  // `items` can be mutated (`item[0]` can be deleted, for example) and this component will be stale
  const item = useMut(items[0]);

  return <div>{item.title}</div>;
};
```

Good:

```javascript
import { mut, use, useMut, useSel } from 'react-mut';

const items = [{ title: 'title' }];

const Component = () => {
  // select `item[0]`
  const item = useSel(() => use(items)[0]);
  // subscribe to `item`
  useMut(item);

  return <div>{item.title}</div>;
};
```
