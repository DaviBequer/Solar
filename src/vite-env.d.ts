/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;

declare module 'html2pdf.js' {
  const html2pdf: () => {
    set: (opt: Record<string, unknown>) => ReturnType<typeof html2pdf>;
    from: (el: HTMLElement) => ReturnType<typeof html2pdf>;
    outputPdf: (type: 'blob') => Promise<Blob>;
    save: () => Promise<void>;
    // Encadeamento usado para juntar várias páginas no mesmo PDF
    toPdf: () => ReturnType<typeof html2pdf>;
    toContainer: () => ReturnType<typeof html2pdf>;
    toCanvas: () => ReturnType<typeof html2pdf>;
    get: (key: 'pdf') => { then: (fn: (pdf: { addPage: () => void }) => void) => ReturnType<typeof html2pdf> };
  };
  export default html2pdf;
}
