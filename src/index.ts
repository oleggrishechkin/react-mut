import { useCallback } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { useSyncExternalStore } from 'use-sync-external-store/shim';

type Obj = Record<any, any> | any[] | Set<any> | Map<any, any> | WeakSet<any> | WeakMap<any, any>;

const objSubs = new WeakMap<Obj, Set<() => void>>();

const objVersion = new WeakMap<Obj, Obj>();

let batchedObjs: Set<Obj> | null = null;

const sub = (obj: Obj | null | undefined, callback: () => void): (() => void) => {
    if (!obj) {
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

const ver = (obj: Obj | null | undefined): Obj | null | undefined => (obj ? objVersion.get(obj) || obj : obj);

const mut = <T extends Obj | null | undefined>(obj: T): T => {
    if (!obj || !objSubs.has(obj)) {
        return obj;
    }

    objVersion.set(obj, {});

    if (batchedObjs) {
        batchedObjs.add(obj);

        return obj;
    }

    batchedObjs = new Set([obj!]);
    Promise.resolve().then(() => {
        const objs = batchedObjs!;

        batchedObjs = null;
        unstable_batchedUpdates(() =>
            objs.forEach((obj) => {
                const subs = objSubs.get(obj);

                if (subs) {
                    subs.forEach((sub) => sub());
                }
            })
        );
    });

    return obj;
};

interface UseMut {
    (obj: Obj | null | undefined): Obj | null | undefined;
    <T>(selector: () => T, deps: (Obj | null | undefined)[]): T;
}

const useMut: UseMut = <T>(
    obj: Obj | null | undefined | (() => T),
    deps?: (Obj | null | undefined)[]
): T | Obj | null | undefined => {
    const subscribe = useCallback((handleChange: () => void) => {
        if (deps) {
            const unsubs = deps.map((obj) => sub(obj, handleChange));

            return () => unsubs.forEach((unsub) => unsub());
        }

        return sub(obj, handleChange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps || [obj]);

    return useSyncExternalStore(subscribe, deps && obj && typeof obj !== 'object' ? obj : () => ver(obj));
};

export { sub, ver, mut, useMut };
