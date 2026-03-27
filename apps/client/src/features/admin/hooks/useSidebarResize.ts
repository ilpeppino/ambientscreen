import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";
import {
  clampSidebarWidth,
  SIDEBAR_DEFAULT_WIDTH,
} from "../sidebarResize.logic";

interface UseSidebarResizeResult {
  sidebarWidth: number;
  /** Call with the mousedown clientX to begin a drag. Web-only; no-op on native. */
  startDrag: (clientX: number) => void;
  /** True while a drag is in progress — useful for suppressing hover states. */
  dragging: boolean;
}

/**
 * Manages the resizable sidebar width for the admin editor.
 *
 * Sidebar constraints:
 * - Minimum width: SIDEBAR_MIN_WIDTH (200px)
 * - Maximum width: 30% of viewport width
 * - Dragging is web-only (no-op on native)
 */
export function useSidebarResize(): UseSidebarResizeResult {
  const { width: windowWidth } = useWindowDimensions();
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);

  // Refs for drag state — avoids stale closures in document event listeners
  const isDragging = useRef(false);
  const startClientX = useRef(0);
  const startWidth = useRef(0);
  // Keep viewport width accessible inside stable document listeners
  const windowWidthRef = useRef(windowWidth);
  windowWidthRef.current = windowWidth;

  // Re-clamp when the viewport shrinks
  useEffect(() => {
    setSidebarWidth((prev) => clampSidebarWidth(prev, windowWidth));
  }, [windowWidth]);

  // Register document-level mouse listeners once on web
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const delta = e.clientX - startClientX.current;
      setSidebarWidth(
        clampSidebarWidth(startWidth.current + delta, windowWidthRef.current),
      );
    }

    function onMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      setDragging(false);
      // Restore text selection
      (document.body.style as CSSStyleDeclaration).userSelect = "";
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []); // Stable — reads all mutable values from refs

  const startDrag = useCallback((clientX: number) => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    isDragging.current = true;
    startClientX.current = clientX;
    startWidth.current = sidebarWidth;
    setDragging(true);
    // Prevent text selection during drag
    (document.body.style as CSSStyleDeclaration).userSelect = "none";
  }, [sidebarWidth]);

  return { sidebarWidth, startDrag, dragging };
}
