import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import canvasConfetti from "canvas-confetti";

export const Confetti = forwardRef((props, ref) => {
  const { options, globalOptions = { resize: true, useWorker: true }, manualstart, children, ...rest } = props;
  const instanceRef = useRef(null);

  const canvasRef = useCallback(
    (node) => {
      if (node !== null) {
        if (instanceRef.current) return;
        instanceRef.current = canvasConfetti.create(node, { ...globalOptions, resize: true });
      } else {
        if (instanceRef.current) {
          instanceRef.current.reset();
          instanceRef.current = null;
        }
      }
    },
    [globalOptions]
  );

  const fire = useCallback(
    (opts = {}) => {
      instanceRef.current?.({ ...options, ...opts });
    },
    [options]
  );

  const api = useMemo(() => ({ fire }), [fire]);

  useImperativeHandle(ref, () => api, [api]);

  useEffect(() => {
    if (!manualstart) {
      fire();
    }
  }, [manualstart, fire]);

  return (
    <canvas
      ref={canvasRef}
      {...rest}
      style={{
        pointerEvents: "none",
        width: "100%",
        height: "100%",
        ...rest.style,
      }}
    />
  );
});

Confetti.displayName = "Confetti";
