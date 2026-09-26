"use client";

import { useEffect, useState } from "react";

// TKT-0281: "Install app" for the portal header.
//  - Chrome/Edge/Android: the browser fires `beforeinstallprompt`; we keep that
//    event and show our own button, which opens the browser's install dialog.
//  - iPhone/iPad: there is no install prompt at all, so the button opens a
//    short "Share, then Add to Home Screen" instruction instead.
//  - Already running as an installed app, or a browser that offers neither
//    (e.g. desktop Firefox): render nothing.
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function isIos() {
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
}

export default function InstallAppButton() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time read of browser display state, not derivable during render (SSR has no window).
      setInstalled(true);
      return;
    }
    setIos(isIos());
    const onPrompt = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice.catch(() => {});
    // The browser only lets one saved event be used once.
    setPromptEvent(null);
  }

  if (installed || (!promptEvent && !ios)) return null;

  return (
    <>
      <button className="btn-ghost" style={{ whiteSpace: "nowrap" }} onClick={ios ? () => setHelpOpen(true) : install}>
        Install app
      </button>
      {helpOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
          onClick={() => setHelpOpen(false)}
        >
          <div className="card" role="dialog" aria-modal="true" aria-label="Install DivergenCIE" style={{ maxWidth: 380, width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Install DivergenCIE</h3>
            <ol className="text-sm space-y-2 mb-4" style={{ paddingLeft: "1.25rem", listStyle: "decimal" }}>
              <li>Tap the Share button in Safari (the square with an arrow).</li>
              <li>Scroll down and tap Add to Home Screen.</li>
              <li>Tap Add. DivergenCIE now opens from your home screen like an app.</li>
            </ol>
            <button className="btn" onClick={() => setHelpOpen(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
