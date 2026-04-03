/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL: string;
  // 之後新增其他變數也加在這裡
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}