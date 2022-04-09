import { useCallback, useRef } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';

type Obj = Record<any, any> | any[] | Set<any> | Map<any, any> | WeakSet<any> | WeakMap<any, any>;

let clock = {};

const objSubs = new WeakMap<Obj, Set<() => void>>();

const objVersion = new WeakMap<Obj, Obj>();

const isObject = <T>(obj: T): boolean => typeof obj === 'object' && obj !== null;

let batchedObjs: Set<Obj> | null = null;

const sub = (obj: any, callback: () => void): (() => void) => {
    if (!isObject(obj)) {
        return () => {};
    }

    let subs = objSubs.get(obj);

    if (subs) {
        subs.add(callback);
    } else {
        subs = new Set([callback]);
        objSubs.set(obj, subs);
    }

    return () => {
        if (subs!.size === 1) {
            objSubs.delete(obj);
            objVersion.delete(obj);

            return;
        }

        subs!.delete(callback);
    };
};

const ver = <T>(obj: T): T | Obj => (isObject(obj) ? objVersion.get(obj) || obj : obj);

const mut = <T>(obj: T): T => {
    if (!isObject(obj) || !objSubs.has(obj)) {
        return obj;
    }

    objVersion.set(obj, {});

    if (batchedObjs) {
        batchedObjs.add(obj);

        return obj;
    }

    batchedObjs = new Set([obj]);
    Promise.resolve().then(() => {
        const objs = batchedObjs!;

        batchedObjs = null;

        const uniqueSubs = new Set<() => void>();

        objs.forEach((obj) => {
            const subs = objSubs.get(obj);

            if (subs) {
                subs.forEach((sub) => uniqueSubs.add(sub));
            }
        });
        clock = {};
        uniqueSubs.forEach((sub) => sub());
    });

    return obj;
};

const useMut = <T>(obj: T) =>
    useSyncExternalStore(
        useCallback((handleChange: () => void) => sub(obj, handleChange), [obj]),
        () => ver(obj)
    );

const useSel = <T>(sel: (use: <R>(obj: R) => R) => T) => {
    const vars = useRef<{
        unsubs: Set<() => void>;
        callback: () => void;
        onStoreChange: () => void;
        subscribe: (handleChange: () => void) => () => void;
    } | null>(null);

    if (vars.current === null) {
        vars.current = {
            unsubs: new Set(),
            callback: () => vars.current!.onStoreChange(),
            onStoreChange: () => {},
            subscribe: (onStoreChange: () => void) => {
                vars.current!.onStoreChange = onStoreChange;

                return () => vars.current!.unsubs.forEach((unsub) => unsub());
            }
        };
    }

    let currentClock: typeof clock;
    let value: T;

    return useSyncExternalStore(vars.current.subscribe, () => {
        if (currentClock === undefined || currentClock !== clock) {
            currentClock = clock;

            const objs = new Set<Obj>();
            const use = <R>(obj: R): R => {
                if (isObject(obj)) {
                    objs.add(obj);
                }

                return obj;
            };

            value = sel(use);
            vars.current!.unsubs.forEach((unsub) => unsub());
            vars.current!.unsubs = new Set();
            objs.forEach((obj) => vars.current!.unsubs.add(sub(obj, vars.current!.callback)));
        }

        return value;
    });
};

export { sub, ver, mut, useMut, useSel };
