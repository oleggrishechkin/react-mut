import { useCallback } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';

type ObjectType = Record<any, any> | any[] | Set<any> | Map<any, any> | WeakSet<any> | WeakMap<any, any>;

type Version = any;

const selectorObject = {};

type Subscriber = {
    callback: () => void;
    version: Version;
};

let batchedObjects: Set<ObjectType> | null = null;

const objectSubscribers = new WeakMap<ObjectType, Set<Subscriber>>();

const objectVersion = new WeakMap<ObjectType, Version>();

const isObject = <T>(object: T): boolean => typeof object === 'object' && object !== null;

export const ver = <T>(object: T): T | Version => (isObject(object) ? objectVersion.get(object) || object : object);

export const sub = <T>(object: T, callback: () => void): (() => void) => {
    if (!isObject(object)) {
        return () => {};
    }

    const subscriber = { callback: callback, version: ver(object) };
    let subscribers = objectSubscribers.get(object);

    if (subscribers) {
        subscribers.add(subscriber);
    } else {
        subscribers = new Set([subscriber]);
        objectSubscribers.set(object, subscribers);
    }

    return () => {
        if (subscribers!.size === 1) {
            objectSubscribers.delete(object);
            objectVersion.delete(object);

            return;
        }

        subscribers!.delete(subscriber);
    };
};

export const mut = <T>(object: T): T => {
    const isBatched = batchedObjects !== null;

    if (batchedObjects === null) {
        batchedObjects = new Set([selectorObject]);
        objectVersion.set(selectorObject, {});
    }

    if (isObject(object) && objectSubscribers.has(object!)) {
        batchedObjects.add(object!);
        objectVersion.set(object!, {});
    }

    if (isBatched) {
        return object;
    }

    Promise.resolve().then(() => {
        const objects = batchedObjects!;

        batchedObjects = null;
        objects.forEach((object) => {
            const subscribers = objectSubscribers.get(object);

            if (subscribers) {
                const version = ver(object);

                subscribers.forEach((subscriber) => {
                    if (subscriber.version !== version) {
                        subscriber.version = version;
                        subscriber.callback();
                    }
                });
            }
        });
    });

    return object;
};

export const useMut = <T>(object: T): T => {
    useSyncExternalStore(
        useCallback((handleChange: () => void) => sub(object, handleChange), [object]),
        () => ver(object)
    );

    return object;
};

export const useSel = <T>(sel: () => T): T =>
    useSyncExternalStore(
        useCallback((handleChange: () => void) => sub(selectorObject, handleChange), []),
        sel
    );

export const useMutSel = <T>(sel: () => T): T => {
    const object = useSel(sel);

    return useMut(object);
};
