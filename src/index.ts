import { useCallback, useRef } from 'react';
import { useSyncExternalStore } from 'use-sync-external-store/shim';

type Obj = Record<any, any> | any[] | Set<any> | Map<any, any> | WeakSet<any> | WeakMap<any, any>;

let clock = {};

let currentObjs: Set<Obj> | null = null;

let batchedObjs: Set<Obj> | null = null;

const objSubs = new WeakMap<Obj, Set<() => void>>();

const objVersion = new WeakMap<Obj, Obj>();

const isObject = <T>(obj: T): boolean => typeof obj === 'object' && obj !== null;

const unsub = (obj: any, callback: () => void) => {
    if (isObject(obj)) {
        const subs = objSubs.get(obj);

        if (subs) {
            if (subs.size === 1) {
                objSubs.delete(obj);
                objVersion.delete(obj);

                return;
            }

            subs.delete(callback);
        }
    }
};

const sub = (obj: any, callback: () => void): (() => void) => {
    if (isObject(obj)) {
        let subs = objSubs.get(obj);

        if (subs) {
            subs.add(callback);
        } else {
            subs = new Set([callback]);
            objSubs.set(obj, subs);
        }
    }

    return () => unsub(obj, callback);
};

const ver = <T>(obj: T): T | Obj => (isObject(obj) ? objVersion.get(obj) || obj : obj);

const mut = <T>(obj: T): T => {
    if (isObject(obj) && objSubs.has(obj)) {
        clock = {};
        objVersion.set(obj, {});

        if (batchedObjs) {
            batchedObjs.add(obj);
        } else {
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
                uniqueSubs.forEach((sub) => sub());
            });
        }
    }

    return obj;
};

const use = <T>(obj: T) => {
    if (currentObjs && isObject(obj)) {
        currentObjs.add(obj);
    }

    return obj;
};

const useMut = <T>(obj: T) => {
    useSyncExternalStore(
        useCallback((handleChange: () => void) => sub(obj, handleChange), [obj]),
        () => ver(obj)
    );

    return obj;
};

const useSel = <T>(sel: () => T) => {
    const vars = useRef<{
        objs: Set<Obj>;
        callback: () => void;
        onStoreChange: () => void;
        subscribe: (handleChange: () => void) => () => void;
    } | null>(null);

    if (vars.current === null) {
        vars.current = {
            objs: new Set(),
            callback: () => vars.current!.onStoreChange(),
            onStoreChange: () => {},
            subscribe: (onStoreChange: () => void) => {
                vars.current!.onStoreChange = onStoreChange;

                return () => {
                    const { objs, callback } = vars.current!;

                    objs.forEach((obj) => unsub(obj, callback));
                };
            }
        };
    }

    let currentClock: typeof clock;
    let value: T;

    return useSyncExternalStore(vars.current.subscribe, () => {
        if (currentClock !== clock) {
            currentClock = clock;

            const objs = new Set<Obj>();

            currentObjs = objs;
            value = sel();
            currentObjs = null;

            const { objs: prevObjs, callback } = vars.current!;

            prevObjs.forEach((obj) => {
                if (objs.has(obj)) {
                    return;
                }

                unsub(obj, callback);
            });
            objs.forEach((obj) => {
                if (prevObjs.has(obj)) {
                    return;
                }

                sub(obj, callback);
            });
            vars.current!.objs = objs;
        }

        return value;
    });
};

export { sub, unsub, ver, mut, use, useMut, useSel };
