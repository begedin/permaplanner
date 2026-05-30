/// <reference types="vite/client" />

declare module '*.html?raw' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_GITHUB_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
