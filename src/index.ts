import { useCallback, useMemo, useSyncExternalStore } from 'react';

type AnyObject = any;

type Version = any;

const selectorObject = {};

let batchedObjects: Set<AnyObject> | null = null;

const objectSubscribers = new WeakMap<AnyObject, Set<() => void>>();

const objectVersion = new WeakMap<AnyObject, Version>();

const isObject = <T>(object: T) => typeof object === 'function' || (typeof object === 'object' && object !== null);

export const ver = <T>(object: T): T | Version => (isObject(object) ? objectVersion.get(object) || object : object);

export const unsub = <T>(object: T, callback?: () => void): void => {
    if (isObject(object)) {
        const subscribers = objectSubscribers.get(object);

        if (subscribers) {
            if (callback) {
                subscribers.delete(callback);

                if (!subscribers.size) {
                    objectSubscribers.delete(object);
                    objectVersion.delete(object);
                }

                return;
            }

            subscribers.clear();
            objectSubscribers.delete(object);
            objectVersion.delete(object);
        }
    }
};

export const sub = <T>(object: T, callback: () => void): (() => void) => {
    if (isObject(object)) {
        let subscribers = objectSubscribers.get(object);

        if (!subscribers) {
            subscribers = new Set();
            objectSubscribers.set(object, subscribers);
        }

        subscribers.add(callback);
    }

    return () => unsub(object, callback);
};

let mutPromise: Promise<void> | null = null;

export const sync = (): void => {
    while (batchedObjects) {
        const objects = batchedObjects;

        batchedObjects = null;

        for (const object of objects) {
            const subscribers = objectSubscribers.get(object);

            if (subscribers) {
                for (const subscriber of subscribers) {
                    subscriber();
                }
            }
        }
    }

    mutPromise = null;
};

export const mut = <T>(object: T): T => {
    if (!batchedObjects) {
        batchedObjects = new Set();
    }

    if (!batchedObjects.has(selectorObject)) {
        objectVersion.set(selectorObject, {});
    }

    if (objectSubscribers.has(selectorObject)) {
        batchedObjects.add(selectorObject);
    }

    if (isObject(object)) {
        if (!batchedObjects.has(object)) {
            objectVersion.set(object, {});
        }

        if (objectSubscribers.has(object)) {
            batchedObjects.add(object);
        }
    }

    if (!mutPromise) {
        const promise = Promise.resolve().then(() => {
            if (mutPromise === promise) {
                sync();
            }
        });

        mutPromise = promise;
    }

    return object;
};

export interface UseMut {
    <T>(object: T): T;
    <T, K>(object: T, sel: () => K): K;
}

export const useMut: UseMut = <T, K>(object: T, sel?: () => K): T | K => {
    const value = useSyncExternalStore(
        useCallback((onStoreChange) => sub(object, onStoreChange), [object]),
        useMemo(() => {
            if (!sel) {
                return () => ver(object);
            }

            let value: any = {};
            let selected: K;

            return () => {
                const nextValue = ver(object);

                if (nextValue === value) {
                    return selected;
                }

                value = nextValue;
                selected = sel();

                return selected;
            };
        }, [sel, object]),
    );

    return sel ? value : object;
};

export const useSel = <T>(sel: () => T) => useMut(selectorObject, sel);

export const useMutSel = <T>(sel: () => T) => useMut(useSel(sel));
