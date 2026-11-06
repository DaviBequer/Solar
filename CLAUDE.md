# Sonit — regras do projeto

- O app se chama **Sonit** (com um N só). O repositório é `DaviBequer/Solar`.
- Visual aprovado: layout "Sol a Pino" com as cores do "Patrimônio" (azul-marinho `#14213F`, dourado `#C6A15B`, dourado claro `#F1E6CF`, fundo `#F2F3F6`), fonte Lexend. Os tokens estão em `src/styles.css`.
- **Toda publicação muda a versão**, e a versão aparece ao lado da logo (`src/ui/chrome.tsx` lê `__APP_VERSION__` do `package.json`). Publique sempre com `npm run publicar`, nunca à mão. Registre o que mudou em `CHANGELOG.md` antes de publicar.
- Regras de dinheiro ficam em `src/core/calc.ts`, com testes em `src/core/calc.test.ts`. Qualquer mudança de cálculo precisa de teste.
- Dados no IndexedDB (`src/data/db.ts`). Mudou a estrutura? Mantenha a importação de backups antigos funcionando (`src/data/backup.ts`).
- Textos da interface em português do Brasil, frases curtas, sem caixa alta.
