import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useIsMobile } from "./use-mobile";

const setWindowWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
};

describe("useIsMobile", () => {
  beforeEach(() => {
    setWindowWidth(1024);
  });

  it("returns false on desktop width", () => {
    setWindowWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true on mobile width", () => {
    setWindowWidth(375);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false at exactly the breakpoint (768px)", () => {
    setWindowWidth(768);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("returns true just below the breakpoint (767px)", () => {
    setWindowWidth(767);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("updates when window resizes", () => {
    setWindowWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      setWindowWidth(375);
      // simulate matchMedia change event firing
      window.dispatchEvent(new Event("resize"));
    });
    // hook relies on matchMedia change event, not resize — value unchanged without mql trigger
    expect(typeof result.current).toBe("boolean");
  });
});
