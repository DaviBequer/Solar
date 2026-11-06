/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;

declare module 'html2pdf.js' {
  const html2pdf: () => {
    set: (opt: Record<string, unknown>) => ReturnType<typeof html2pdf>;
    from: (el: HTMLElement) => ReturnType<typeof html2pdf>;
    outputPdf: (type: 'blob') => Promise<Blob>;
    save: () => Promise<void>;
  };
  export default html2pdf;
}
