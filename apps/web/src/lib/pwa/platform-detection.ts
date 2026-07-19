/**
 * Detecta Safari em iOS/iPadOS fora do modo standalone — navegadores sem suporte ao evento
 * `beforeinstallprompt` (RF-04), onde a instalação só é possível via instrução manual
 * (Compartilhar → Adicionar à Tela de Início).
 *
 * @spec SPEC-20260712-001 RF-04
 */
export function isIosInstallable(): boolean {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent;
  const isIosDevice = /iPad|iPhone|iPod/.test(userAgent);
  // iPadOS 13+ reporta userAgent de desktop Safari — diferencia via touch support.
  const isIpadOsDesktopUa =
    userAgent.includes("Macintosh") && typeof document !== "undefined" && "ontouchend" in document;

  const nav = navigator as Navigator & { standalone?: boolean };
  const isStandalone = nav.standalone === true;

  return (isIosDevice || isIpadOsDesktopUa) && !isStandalone;
}
