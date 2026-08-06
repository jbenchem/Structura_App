// React with hooks stubbed so components can be called as plain
// functions outside a renderer. createElement is real enough to
// build and walk the returned tree.
export const createElement = (type, props, ...children) => ({
  type, props: { ...(props || {}), children: children.length === 1 ? children[0] : children },
});
export const Fragment = 'Fragment';
// Tests can pin the first useState of a component (the step index in the
// lesson player) so every step can be rendered, not just the first.
export const useState = (init) => {
  const v = typeof init === 'function' ? init() : init;
  if (typeof globalThis.__stepIndex === 'number' && v === 0) {
    const pinned = globalThis.__stepIndex;
    globalThis.__stepIndex = null;
    return [pinned, () => {}];
  }
  return [v, () => {}];
};
export const useRef = (v) => ({ current: v });
export const useMemo = (fn) => fn();
export const useCallback = (fn) => fn;
export const useEffect = () => {};
export const useReducer = (r, init) => [init, () => {}];
export const useContext = () => ({});
export const createContext = () => ({ Provider: 'Provider' });
export default {
  forwardRef,
  useImperativeHandle, createElement, Fragment, useState, useRef, useMemo, useCallback, useEffect };

// forwardRef / useImperativeHandle: enough for components to execute.
export const forwardRef = (fn) => {
  // Pass the caller's ref through rather than swallowing it, so a test can
  // reach a component's imperative methods.
  const C = (props, ref) => fn(props, ref || { current: null });
  C.displayName = fn.name;
  return C;
};
// Assign for real, so tests can call a component's imperative methods. Those
// run outside render, which is exactly where undefined locals hide.
export const useImperativeHandle = (ref, factory) => {
  if (ref && typeof factory === 'function') ref.current = factory();
};
