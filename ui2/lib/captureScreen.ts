/**
 * A picture of exactly what is on screen (scroll position, sticky bars, open sheets), as a JPEG data URL, or null if it cannot be made.
 * html-to-image copies the browser's own computed styles into the picture, so it matches what the person sees. Anything inside an element
 * marked `data-screenshot-skip` (the screenshot button itself) is left out. The caller opens the report dialog only AFTER this returns,
 * so the dialog is never in the picture.
 */
export const SKIP_ATTRIBUTE = "data-screenshot-skip";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const within = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

export async function captureScreen(): Promise<string | null> {
  try {
    const { toJpeg } = await import("html-to-image");
    if (document.fonts?.ready) await Promise.race([document.fonts.ready, wait(1500)]); // fonts and images finish drawing first
    await wait(250);
    const root = document.documentElement;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const background = getComputedStyle(document.body).backgroundColor;
    const options = {
      width: w,
      height: h,
      canvasWidth: w,
      canvasHeight: h,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
      quality: 0.72,
      backgroundColor: background && background !== "rgba(0, 0, 0, 0)" ? background : "#ffffff", // design-lint: allow (a picture's own white, not an interface colour)
      filter: (node: Node) => !(node instanceof Element && node.closest(`[${SKIP_ATTRIBUTE}]`)),
      // a negative margin scrolls the copy; a transform would also drag the sticky bars out of place
      style: { marginTop: `${-window.scrollY}px`, marginLeft: `${-window.scrollX}px`, width: `${root.scrollWidth}px`, height: `${root.scrollHeight}px` },
    };
    try {
      return await within(toJpeg(root, { ...options, cacheBust: true }), 9000);
    } catch {
      return await within(toJpeg(root, { ...options, cacheBust: false }), 9000); // one more try: a picture that fails to load can break the first
    }
  } catch {
    return null;
  }
}
