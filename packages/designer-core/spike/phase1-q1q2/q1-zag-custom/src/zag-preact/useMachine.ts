import { useMemo, useRef, useState, useEffect, useLayoutEffect } from 'preact/hooks';
import {
  createScope,
  findTransition,
  getExitEnterStates,
  hasTag,
  INIT_STATE,
  MachineStatus,
  matchesState,
  resolveStateValue,
} from '@zag-js/core';
import type { Machine, MachineSchema, Service } from '@zag-js/core';
import { compact, ensure, isFunction, isString, toArray, warn } from '@zag-js/utils';

const safeLayoutEffect = typeof globalThis.document !== 'undefined' ? useLayoutEffect : useEffect;

function useLiveRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

function useRefsBag<T extends Record<string, any>>(initial: T) {
  const ref = useRef(initial);
  return {
    get(key: keyof T) {
      return ref.current[key];
    },
    set(key: keyof T, value: T[typeof key]) {
      ref.current[key] = value;
    },
  };
}

const useTrack = (deps: any[], effect: () => void) => {
  const render = useRef(false);
  const called = useRef(false);
  useEffect(() => {
    const mounted = render.current;
    const run = mounted && called.current;
    if (run) return effect();
    called.current = true;
  }, (deps ?? []).map((d) => (typeof d === 'function' ? d() : d)));
  useEffect(() => {
    render.current = true;
    return () => {
      render.current = false;
    };
  }, []);
};

function useBindable<T>(propsFn: () => any) {
  const initial = propsFn().value ?? propsFn().defaultValue;
  const eq = propsFn().isEqual ?? Object.is;
  const [initialValue] = useState<T>(initial);
  const [value, setValue] = useState<T>(initialValue);
  const controlled = propsFn().value !== undefined;
  const valueRef = useRef<T>(value);
  valueRef.current = controlled ? propsFn().value : value;
  const prevValue = useRef<T>(valueRef.current);
  safeLayoutEffect(() => {
    prevValue.current = valueRef.current;
  }, [value, propsFn().value]);
  const setFn = (nextRaw: any) => {
    const prev = prevValue.current;
    const next = isFunction(nextRaw) ? nextRaw(prev) : nextRaw;
    if (!controlled) setValue(next);
    if (!eq(next, prev)) propsFn().onChange?.(next, prev);
  };
  return {
    initial: initialValue,
    ref: valueRef,
    get() {
      return controlled ? propsFn().value : value;
    },
    set(v: any) {
      setFn(v);
    },
    invoke(next: T, prev: T) {
      propsFn().onChange?.(next, prev);
    },
    hash(v: T) {
      return propsFn().hash?.(v) ?? String(v);
    },
  };
}
(useBindable as any).cleanup = (fn: () => void) => {
  useEffect(() => fn, []);
};
(useBindable as any).ref = <T,>(defaultValue: T) => {
  const value = useRef(defaultValue);
  return { get: () => value.current, set: (n: T) => (value.current = n) };
};

export function useMachine<T extends MachineSchema>(
  machine: Machine<T>,
  userProps: any = {},
): Service<T> {
  const scope = useMemo(() => {
    const { id, ids, getRootNode } = userProps;
    return createScope({ id, ids, getRootNode });
  }, [userProps]);

  const props = machine.props?.({ props: compact(userProps), scope }) ?? userProps;
  const propRef = useLiveRef(props);
  const prop = (key: any) => (propRef.current as any)[key];

  const context = machine.context?.({
    prop,
    bindable: useBindable as any,
    scope,
    flush,
    getContext: () => ctx,
    getComputed: () => computed,
    getRefs: () => refs,
    getEvent: () => getEvent(),
  });
  const contextRef = useLiveRef(context as any);
  const ctx = {
    get(key: any) {
      return (contextRef.current as any)?.[key]?.ref.current;
    },
    set(key: any, value: any) {
      (contextRef.current as any)?.[key]?.set(value);
    },
    initial(key: any) {
      return (contextRef.current as any)?.[key]?.initial;
    },
    hash(key: any) {
      const current = (contextRef.current as any)?.[key]?.get();
      return (contextRef.current as any)?.[key]?.hash(current);
    },
  } as any;

  const effectsMap = useRef(new Map<string, (() => void) | undefined>());
  const transitionRef = useRef<any>(null);
  const previousEventRef = useRef<any>(null);
  const eventRef = useRef<any>({ type: '' });
  const getEvent = () => ({
    ...eventRef.current,
    current: () => eventRef.current,
    previous: () => previousEventRef.current,
  });

  const refs = useRefsBag(machine.refs?.({ prop, context: ctx }) ?? {}) as any;

  const getState = () => ({
    ...(state as any),
    matches: (...values: any[]) => values.some((v) => matchesState((state as any).ref.current, v)),
    hasTag: (tag: any) => hasTag(machine as any, (state as any).ref.current, tag),
  });

  const getParams = () => ({
    state: getState(),
    context: ctx,
    event: getEvent(),
    prop,
    send,
    action,
    guard,
    track: useTrack,
    refs,
    computed,
    flush,
    scope,
    choose,
  });

  const action = (keys: any) => {
    const strs = isFunction(keys) ? keys(getParams()) : keys;
    if (!strs) return;
    for (const s of strs) {
      const fn = (machine.implementations as any)?.actions?.[s];
      if (!fn) warn(`[zag-js] No implementation found for action "${JSON.stringify(s)}"`);
      fn?.(getParams());
    }
  };
  const guard = (str: any) => {
    if (isFunction(str)) return str(getParams());
    return (machine.implementations as any)?.guards?.[str](getParams());
  };
  const effect = (keys: any) => {
    const strs = isFunction(keys) ? keys(getParams()) : keys;
    if (!strs) return;
    const cleanups: Array<() => void> = [];
    for (const s of strs) {
      const fn = (machine.implementations as any)?.effects?.[s];
      if (!fn) warn(`[zag-js] No implementation found for effect "${JSON.stringify(s)}"`);
      const cleanup = fn?.(getParams());
      if (cleanup) cleanups.push(cleanup);
    }
    return () => cleanups.forEach((fn) => fn?.());
  };
  const choose = (transitions: any) =>
    toArray(transitions).find((t: any) => {
      let result = !t.guard;
      if (isString(t.guard)) result = !!guard(t.guard);
      else if (isFunction(t.guard)) result = t.guard(getParams());
      return result;
    });
  const computed = (key: any) => {
    ensure((machine as any).computed, () => `[zag-js] No computed object found on machine`);
    const fn = (machine as any).computed[key];
    return fn({ context: ctx, event: getEvent(), prop, refs, scope, computed });
  };

  const state = (useBindable as any)(() => ({
    defaultValue: resolveStateValue(machine as any, machine.initialState({ prop })),
    onChange(nextState: any, prevState: any) {
      const { exiting, entering } = getExitEnterStates(
        machine as any,
        prevState,
        nextState,
        transitionRef.current?.reenter,
      );
      exiting.forEach((item: any) => {
        const exitEffects = effectsMap.current.get(item.path);
        exitEffects?.();
        effectsMap.current.delete(item.path);
      });
      exiting.forEach((item: any) => action(item.state?.exit));
      action(transitionRef.current?.actions);
      entering.forEach((item: any) => {
        const cleanup = effect(item.state?.effects);
        if (cleanup) effectsMap.current.set(item.path, cleanup);
      });
      if (prevState === INIT_STATE) {
        action(machine.entry);
        const cleanup = effect(machine.effects);
        if (cleanup) effectsMap.current.set(INIT_STATE, cleanup);
      }
      entering.forEach((item: any) => action(item.state?.entry));
    },
  }));

  const hydratedStateRef = useRef<any>(undefined);
  const statusRef = useRef<MachineStatus>(MachineStatus.NotStarted);
  safeLayoutEffect(() => {
    queueMicrotask(() => {
      const started = statusRef.current === MachineStatus.Started;
      statusRef.current = MachineStatus.Started;
      const initialState = hydratedStateRef.current ?? state.initial;
      state.invoke(initialState, started ? state.get() : INIT_STATE);
    });
    const fns = effectsMap.current;
    return () => {
      const currentState = getCurrentState();
      hydratedStateRef.current = currentState;
      statusRef.current = MachineStatus.Stopped;
      fns.forEach((fn) => fn?.());
      effectsMap.current = new Map();
      transitionRef.current = null;
      queueMicrotask(() => {
        action(machine.exit);
        statusRef.current = MachineStatus.Stopped;
      });
    };
  }, []);

  const getCurrentState = () => {
    if ('ref' in state) return state.ref.current;
    return state.get();
  };

  const send = (event: any) => {
    queueMicrotask(() => {
      if (statusRef.current !== MachineStatus.Started) return;
      previousEventRef.current = eventRef.current;
      eventRef.current = event;
      const currentState = getCurrentState();
      const { transitions, source } = findTransition(machine as any, currentState, event.type);
      const transition = choose(transitions);
      if (!transition) return;
      transitionRef.current = transition;
      const target = resolveStateValue(machine as any, transition.target ?? currentState, source);
      const changed = target !== currentState;
      if (changed) state.set(target);
      else if (transition.reenter) state.invoke(currentState, currentState);
      else action(transition.actions ?? []);
    });
  };

  machine.watch?.(getParams());

  return {
    state: getState(),
    send,
    context: ctx,
    prop,
    scope,
    refs,
    computed,
    event: getEvent(),
    getStatus: () => statusRef.current,
  } as unknown as Service<T>;
}

function flush(fn: () => void) {
  queueMicrotask(() => fn());
}
