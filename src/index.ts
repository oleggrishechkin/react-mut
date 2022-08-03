import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';

type AnyObject = any;

type Version = any;

const selectorObject = {};

let batchedObjects: Set<AnyObject> | null = null;

const objectSubscribers = new WeakMap<AnyObject, Set<() => void>>();

const objectVersion = new WeakMap<AnyObject, Version>();

const isObject = <T>(object: T) => typeof object === 'function' || (typeof object === 'object' && object !== null);

export const ver = <T>(object: T): T | Version => (isObject(object) ? objectVersion.get(object) || object : object);

export const unsub = <T>(object: T, callback: () => void): void => {
    if (isObject(object)) {
        const subscribers = objectSubscribers.get(object);

        if (subscribers) {
            subscribers.delete(callback);

            if (!subscribers.size) {
                objectSubscribers.delete(object);
                objectVersion.delete(object);
            }
        }
    }
};

export const sub = <T>(object: T, callback: () => void): (() => void) => {
    if (isObject(object)) {
        const subscribers = objectSubscribers.get(object);

        if (subscribers) {
            subscribers.add(callback);
        } else {
            objectSubscribers.set(object, new Set([callback]));
        }
    }

    return () => unsub(object, callback);
};

let mutPromise: Promise<void> | null = null;

export const mut = <T>(object: T): T => {
    if (!batchedObjects) {
        batchedObjects = new Set();
        mutPromise = Promise.resolve().then(() => {
            const objects = batchedObjects!;

            batchedObjects = null;
            objects.forEach((object) => {
                const subscribers = objectSubscribers.get(object);

                if (subscribers) {
                    subscribers.forEach((subscriber) => subscriber());
                }
            });
            mutPromise = null;
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

export const flush = async (): Promise<void> => {
    if (mutPromise) {
        await mutPromise;
    }
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

export const useMut = <T>(object: T): T => {
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

                if (version !== currentVersion) {
                    currentVersion = version;
                    value = sel();
                }

                return value;
            };
        }, [sel])
    );

export const useMutSel = <T>(sel: () => T): T => useMut(useSel(sel));
