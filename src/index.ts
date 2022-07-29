import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';

type AnyObject = any;

type Version = any;

const selectorObject = {};

let batchedObjects: Set<AnyObject> | null = null;

const objectSubscribers = new WeakMap<AnyObject, Set<() => void>>();

const objectVersion = new WeakMap<AnyObject, Version>();

const isObject = <T>(object: T) => typeof object === 'object' && object !== null;

export const ver = <T>(object: T): T | Version => (isObject(object) ? objectVersion.get(object) || object : object);

export const sub = <T>(object: T, callback: () => void): (() => void) => {
    if (isObject(object)) {
        const subscribers = objectSubscribers.get(object);

        if (subscribers) {
            subscribers.add(callback);
        } else {
            objectSubscribers.set(object, new Set([callback]));
        }

        return () => {
            const subscribers = objectSubscribers.get(object);

            if (subscribers) {
                if (subscribers.size === 1) {
                    objectSubscribers.delete(object);
                    objectVersion.delete(object);
                } else {
                    subscribers.delete(callback);
                }
            }
        };
    }

    return () => {};
};

export const mut = <T>(object: T): T => {
    if (batchedObjects === null) {
        batchedObjects = new Set();
        Promise.resolve().then(() => {
            if (batchedObjects !== null) {
                const objects = batchedObjects;

                batchedObjects = null;
                objects.forEach((object) => {
                    const subscribers = objectSubscribers.get(object);

                    if (subscribers) {
                        subscribers.forEach((subscriber) => subscriber());
                    }
                });
            }
        });
    }

    if (objectSubscribers.has(selectorObject)) {
        batchedObjects.add(selectorObject);
        objectVersion.set(selectorObject, {});
    }

    if (isObject(object) && objectSubscribers.has(object)) {
        batchedObjects.add(object);
        objectVersion.set(object, {});
    }

    return object;
};

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const useSyncExternalStoreShim =
    typeof useSyncExternalStore === 'undefined'
        ? <T>(subscribe: (callback: () => void) => () => void, getSnapshot: () => T): T => {
              const value = getSnapshot();
              const [{ inst }, forceUpdate] = useState({ inst: { value, getSnapshot } });

              useIsomorphicLayoutEffect(() => {
                  inst.value = value;
                  inst.getSnapshot = getSnapshot;

                  if (inst.value !== inst.getSnapshot()) {
                      forceUpdate({ inst });
                  }
              }, [subscribe, value, getSnapshot]);
              useEffect(() => {
                  if (inst.value !== inst.getSnapshot()) {
                      forceUpdate({ inst });
                  }

                  return subscribe(() => {
                      if (inst.value !== inst.getSnapshot()) {
                          forceUpdate({ inst });
                      }
                  });
              }, [inst, subscribe]);

              return value;
          }
        : useSyncExternalStore;

export const useMut =
    typeof useSyncExternalStore === undefined
        ? <T>(object: T): T => {
              const [, setState] = useState(() => ver(object));

              useEffect(() => {
                  setState(ver(object));

                  return sub(object, () => setState(ver(object)));
              }, [object]);

              return object;
          }
        : <T>(object: T): T => {
              useSyncExternalStoreShim(
                  useCallback((handleChange) => sub(object, handleChange), [object]),
                  () => ver(object)
              );

              return object;
          };

export const useSel = <T>(sel: () => T): T =>
    useSyncExternalStoreShim(
        useCallback((handleChange) => sub(selectorObject, handleChange), []),
        useMemo(() => {
            let currentVersion: Version;
            let value: T;

            return () => {
                const version = ver(selectorObject);

                if (version === currentVersion) {
                    return value;
                }

                currentVersion = version;
                value = sel();

                return value;
            };
        }, [sel])
    );

export const useMutSel = <T>(sel: () => T): T => useMut(useSel(sel));
