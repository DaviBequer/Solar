# Sonit — regras do projeto

Antes de começar, leia `PENDENCIAS.md`: ali está onde a última conversa parou e o que vem a seguir.

- O app se chama **Sonit** (com um N só). O repositório é `DaviBequer/Solar`.
- Visual aprovado em novembro de 2026: azul-marinho `#1B2A49`, dourado `#C4A462`, fundo de papel amassado (`src/ui/paper.tsx`), fonte Plus Jakarta Sans e ícones lucide em fundo azul com desenho dourado. A tela de Orçamento segue a ordem cliente, tipo, instalação e conta, casa, sistema, retorno, valor (`src/screens/orcamento.css`). Os tokens estão em `src/styles.css`.
- **Toda publicação muda a versão**, e a versão aparece ao lado da logo (`src/ui/chrome.tsx` lê `__APP_VERSION__` do `package.json`). Publique sempre com `npm run publicar`, nunca à mão. Registre o que mudou em `CHANGELOG.md` antes de publicar.
- Regras de dinheiro ficam em `src/core/calc.ts`, com testes em `src/core/calc.test.ts`. Qualquer mudança de cálculo precisa de teste.
- Dados no IndexedDB (`src/data/db.ts`). Mudou a estrutura? Mantenha a importação de backups antigos funcionando (`src/data/backup.ts`).
- Textos da interface em português do Brasil, frases curtas, sem caixa alta. Exceção pedida pelo Davi: títulos pequenos e opções dos popups do Orçamento, como no app original.
- O repositório é público: nunca colocar o modelo de contrato, backups ou dados de clientes na pasta. `npm run publicar` para se encontrar arquivo novo suspeito.
