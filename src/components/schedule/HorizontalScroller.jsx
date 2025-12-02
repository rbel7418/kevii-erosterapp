import React, { useEffect, useRef, useState } from "react";

export default function HorizontalScroller({ targetRef, height = 14, className = "" }) {
  const scrollerRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(0);

  // Custom scrollbar styles (NHS translucent blue)
  const railClass = "hsbar";

  // Observe width changes of the target scroll container
  useEffect(() => {
    const el = targetRef?.current;
    if (!el) return;
    const update = () => setContentWidth(el.scrollWidth || 0);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);

    const onScrollMain = () => {
      if (!scrollerRef.current) return;
      scrollerRef.current.scrollLeft = el.scrollLeft;
    };
    el.addEventListener("scroll", onScrollMain);

    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", onScrollMain);
    };
  }, [targetRef]);

  // Sync scrolling both ways
  useEffect(() => {
    const el = targetRef?.current;
    const sc = scrollerRef.current;
    if (!el || !sc) return;

    let syncing = false;

    const onScrollBottom = () => {
      if (syncing) return;
      syncing = true;
      el.scrollLeft = sc.scrollLeft;
      syncing = false;
    };
    const onScrollMain = () => {
      if (syncing) return;
      syncing = true;
      sc.scrollLeft = el.scrollLeft;
      syncing = false;
    };

    sc.addEventListener("scroll", onScrollBottom);
    el.addEventListener("scroll", onScrollMain);

    return () => {
      sc.removeEventListener("scroll", onScrollBottom);
      el.removeEventListener("scroll", onScrollMain);
    };
  }, [targetRef]);

  return (
    <div className={`mt-2 ${className}`}>
      <style>{`
        .${railClass} {
          background: rgba(0, 114, 206, 0.06);
          border: 1px solid rgba(0, 114, 206, 0.2);
        }
        .${railClass}::-webkit-scrollbar {
          height: 12px;
        }
        .${railClass}::-webkit-scrollbar-track {
          background: rgba(0, 114, 206, 0.08);
          border-radius: 999px;
        }
        .${railClass}::-webkit-scrollbar-thumb {
          background: rgba(0, 94, 184, 0.45);
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,0.6);
        }
        .${railClass}::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 94, 184, 0.6);
        }
        /* Firefox */
        .${railClass} {
          scrollbar-color: rgba(0, 94, 184, 0.55) rgba(0, 114, 206, 0.12);
          scrollbar-width: thin;
        }
      `}</style>
      <div
        ref={scrollerRef}
        className={`${railClass} overflow-x-auto w-full rounded-full`}
        style={{ height }}
      >
        <div style={{ width: contentWidth, height: Math.max(2, height - 4) }} />
      </div>
    </div>
  );
}