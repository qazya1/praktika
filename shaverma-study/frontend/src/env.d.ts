interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
interface Window {
  Telegram?: { WebApp?: { initData?: string; ready?: () => void; expand?: () => void } };
  WebApp?: { initData?: string; enableClosingConfirmation?: () => void };
}
