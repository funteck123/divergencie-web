"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import { Button } from "./Button";
import "./ConfirmDialog.css";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<unknown>;
}

const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iPad|iPhone|iPod/.test(window.navigator.userAgent) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);

/**
 * "Install app" for the PWA: runs the browser's own prompt where there is one, and shows the Share-sheet steps on iOS.
 * Renders nothing when the app is already installed or the browser offers no install.
 */
export function useInstallApp() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (standalone()) setInstalled(true);
      else setIos(isIos());
    }, 0);
    const onPrompt = (e: Event) => { e.preventDefault(); setPromptEvent(e as InstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setPromptEvent(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  const available = !installed && (!!promptEvent || ios);
  const run = async () => {
    if (ios) return setHelpOpen(true);
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => {});
    setPromptEvent(null);
  };
  const help = (
    <Dialog.Root open={helpOpen} onOpenChange={setHelpOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="u2-portal u2-dialog__overlay" />
        <Dialog.Content className="u2-portal u2-dialog" aria-describedby={undefined}>
          <Dialog.Title className="u2-dialog__title">Install DivergenCIE</Dialog.Title>
          <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
            <li>Tap the Share button in Safari (the square with an arrow).</li>
            <li>Scroll down and tap Add to Home Screen.</li>
            <li>Tap Add. DivergenCIE now opens from your home screen like an app.</li>
          </ol>
          <div className="u2-dialog__actions">
            <Dialog.Close asChild>
              <Button variant="primary">Got it</Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
  return { available, run, help };
}
