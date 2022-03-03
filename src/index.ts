/* eslint-disable @typescript-eslint/ban-types */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { useCallback, useEffect, useReducer, useSyncExternalStore } from 'react';
import { unstable_batchedUpdates } from 'react-dom';

const objSubs = new WeakMap<object, Set<() => void>>();

const objVersion = new WeakMap<object, object>();

let batchedObjs: Set<object> | null = null;

const sub = (obj: object | null | undefined, callback: () => void): (() => void) => {
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

const ver = (obj: object | null | undefined): object | null | undefined => (obj ? objVersion.get(obj) || obj : obj);

const mut = <T extends object | null | undefined>(obj: T): T => {
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

const useMut =
    typeof useSyncExternalStore === 'undefined'
        ? (obj: object | null | undefined): object | null | undefined => {
              const [, forceUpdate] = useReducer(() => ({}), {});

              useEffect(() => sub(obj, forceUpdate), [obj]);

              return ver(obj);
          }
        : (obj: object | null | undefined): object | null | undefined =>
              useSyncExternalStore(
                  useCallback((handleChange: () => void) => sub(obj, handleChange), [obj]),
                  () => ver(obj)
              );

export { sub, ver, mut, useMut };
