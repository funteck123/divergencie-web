"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, LinkButton } from "@/ui2/components/Button";
import { pdfFileName } from "@/ui2/features/solver/solverLogic";
import { clampPage, clampScale, fitWidthScale, loadErrorMessage, pageLabel, pagesToRender, stepScale } from "./viewerLogic";
import "./viewer.css";

// pdf.js (the legacy build, which also runs on older phones) is loaded only when a viewer opens, and its worker is our own static file.
type PdfDoc = import("pdfjs-dist").PDFDocumentProxy;
type PdfPage = import("pdfjs-dist").PDFPageProxy;
const WORKER_SRC = "/ui2/pdf/pdf.worker.min.mjs";

async function openDocument(url: string, onProgress: (loaded: number, total: number) => void): Promise<PdfDoc> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
  const task = pdfjs.getDocument({ url, withCredentials: true });
  task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => onProgress(loaded, total);
  return task.promise;
}

/** One page: an empty box of the right size until it is near the screen, then a canvas. Pages far away give their canvas back. */
function PageView({ doc, number, scale, active, firstSize, onSeen }: { doc: PdfDoc; number: number; scale: number; active: boolean; firstSize: { w: number; h: number }; onSeen: (n: number, seen: boolean) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => entries.forEach((e) => onSeen(number, e.isIntersecting)), { rootMargin: "300px 0px" });
    io.observe(el);
    return () => {
      io.disconnect();
      onSeen(number, false);
    };
  }, [number, onSeen]);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    if (!active) {
      c.width = 0;
      c.height = 0;
      return;
    }
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<unknown> } | null = null;
    void (async () => {
      try {
        const page: PdfPage = await doc.getPage(number);
        if (cancelled) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const css = page.getViewport({ scale });
        const view = page.getViewport({ scale: scale * dpr });
        c.width = Math.floor(view.width);
        c.height = Math.floor(view.height);
        setSize({ w: css.width, h: css.height });
        const ctx = c.getContext("2d");
        if (!ctx) return;
        task = page.render({ canvas: c, canvasContext: ctx, viewport: view });
        await task.promise;
      } catch {
        /* a cancelled draw (zoom changed, page scrolled away) is normal; a real failure leaves the empty box */
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, number, scale, active]);
  const w = size ? size.w : firstSize.w * scale;
  const h = size ? size.h : firstSize.h * scale;
  return (
    <div ref={box} className="u2-pdfv__page" data-page={number} style={{ width: w, height: h }}>
      <canvas ref={canvas} style={{ width: w, height: h }} aria-label={`Page ${number}`} role="img" />
    </div>
  );
}

export interface PdfViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Same-origin address of the PDF. */
  url: string;
  /** What the document is called: shown on top and used as the saved file name. */
  title: string;
}

/**
 * The in-house PDF viewer (TKT-0426): opens full screen from "View notes", shows the file page by page (a big file is usable before the last page
 * arrives), with a page counter, zoom, fit to width, and a Download button inside it.
 */
export function PdfViewer({ open, onOpenChange, url, title }: PdfViewerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Content className="u2-portal u2-pdfv" aria-describedby={undefined}>
          {open && <Inner url={url} title={title} onClose={() => onOpenChange(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Inner({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [scale, setScale] = useState(1);
  const [firstSize, setFirstSize] = useState({ w: 612, h: 792 });
  const [total, setTotal] = useState<number | null>(null);
  const [visible, setVisible] = useState<Set<number>>(new Set([1]));
  const [typed, setTyped] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const fitted = useRef(false);

  useEffect(() => {
    let alive = true;
    let opened: PdfDoc | null = null;
    fitted.current = false;
    void (async () => {
      try {
        setError(null);
        setProgress(0);
        const d = await openDocument(url, (loaded, tot) => alive && setProgress(tot > 0 ? Math.min(1, loaded / tot) : null));
        if (!alive) return void d.destroy();
        opened = d;
        const first = await d.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        if (!alive) return;
        setFirstSize({ w: vp.width, h: vp.height });
        setTotal(d.numPages);
        const room = (scroller.current?.clientWidth ?? 0) - 24;
        if (!fitted.current) {
          fitted.current = true;
          setScale(fitWidthScale(vp.width, room));
        }
        setDoc(d);
      } catch (e) {
        if (alive) setError(loadErrorMessage(e));
      }
    })();
    return () => {
      alive = false;
      void opened?.destroy();
    };
  }, [url, attempt]);

  const seen = useCallback((n: number, isSeen: boolean) => {
    setVisible((prev) => {
      if (prev.has(n) === isSeen) return prev;
      const next = new Set(prev);
      if (isSeen) next.add(n);
      else next.delete(n);
      return next;
    });
  }, []);

  const current = visible.size ? Math.min(...visible) : 1;
  const active = new Set(total ? pagesToRender([...visible], total) : []);
  function goTo(n: number) {
    const target = clampPage(n, total ?? 0, current);
    scroller.current?.querySelector(`[data-page="${target}"]`)?.scrollIntoView({ block: "start" });
  }
  function fit() {
    setScale(fitWidthScale(firstSize.w, (scroller.current?.clientWidth ?? 0) - 24));
  }

  return (
    <>
      <div className="u2-pdfv__bar">
        <Dialog.Title className="u2-pdfv__title" title={title}>{title}</Dialog.Title>
        <LinkButton variant="primary" size="md" href={url} download={pdfFileName(title)} aria-label={`Download ${pdfFileName(title)}`}>Download</LinkButton>
        <Button variant="ghost" onDark onClick={onClose}>Close</Button>
      </div>
      <div className="u2-pdfv__tools" role="toolbar" aria-label="Viewer controls">
        <span className="u2-pdfv__count" role="status">{pageLabel(current, total)}</span>
        <form
          className="u2-pdfv__goto"
          onSubmit={(e) => {
            e.preventDefault();
            goTo(Number(typed));
            setTyped("");
          }}
        >
          <input className="u2-pdfv__input" inputMode="numeric" aria-label="Go to page" placeholder="Page" value={typed} onChange={(e) => setTyped(e.target.value.replace(/\D/g, "").slice(0, 4))} disabled={!doc} />
          <Button type="submit" variant="secondary" disabled={!doc || !typed}>Go</Button>
        </form>
        <Button variant="secondary" aria-label="Zoom out" disabled={!doc} onClick={() => setScale((s) => stepScale(s, -1))}>−</Button>
        <span className="u2-pdfv__zoom" aria-live="polite">{Math.round(clampScale(scale) * 100)}%</span>
        <Button variant="secondary" aria-label="Zoom in" disabled={!doc} onClick={() => setScale((s) => stepScale(s, 1))}>+</Button>
        <Button variant="secondary" disabled={!doc} onClick={fit}>Fit width</Button>
      </div>
      <div ref={scroller} className="u2-pdfv__scroll">
        {error ? (
          <div className="u2-pdfv__msg" role="alert">
            <p>{error}</p>
            <div className="u2-cluster">
              <Button variant="primary" onClick={() => setAttempt((a) => a + 1)}>Try again</Button>
              <LinkButton variant="secondary" size="md" href={url} download={pdfFileName(title)}>Download instead</LinkButton>
            </div>
          </div>
        ) : !doc || !total ? (
          <div className="u2-pdfv__msg" role="status">
            <p>Loading the file{progress !== null && progress > 0 ? `: ${Math.round(progress * 100)}%` : "…"}</p>
            <progress className="u2-pdfv__progress" max={1} value={progress ?? undefined} aria-label="Loading progress" />
            <p className="u2-muted">Large files can take a few seconds. You can already download it.</p>
          </div>
        ) : (
          Array.from({ length: total }, (_, i) => i + 1).map((n) => <PageView key={`${n}`} doc={doc} number={n} scale={scale} active={active.has(n)} firstSize={firstSize} onSeen={seen} />)
        )}
      </div>
    </>
  );
}
