# Onde paramos

Resumo da conversa em que o Sonit foi reescrito (5 e 6 de novembro de 2026), para continuar de onde parou.

## Estado atual

- **v3.0.0 publicada** em https://davibequer.github.io/Solar/ (ramo `gh-pages`, publicado com `npm run publicar`).
- Reescrita completa a partir do app gerado no Google AI Studio. Nada do código antigo é usado; os dois primeiros commits do histórico (`4e49732` e `5d65523`) ainda contêm o código original.
- 21 testes passando (`npm test`): motor de cálculo e importação de backup.
- O fluxo inteiro foi testado num navegador em tamanho de celular (importar kits, orçar, criar cliente, gerar PDF, agendar, fechar venda, painel). Esse teste ficou fora do repositório.

## Decisões já tomadas

- Nome do app: **Sonit**, com um N. Repositório: `DaviBequer/Solar`.
- Visual: layout "Sol a Pino" com as cores do "Patrimônio" (azul-marinho e dourado), fonte Lexend. Telas aprovadas: Orçamento, Clientes, Ficha do cliente, Agenda, Painel, Ajustes, Proposta em PDF.
- A versão aparece ao lado da logo e sobe a cada publicação.
- Comissão: percentual sobre a venda + 50% do que passar do preço da tabela, menos imposto. Diferente do app antigo, a parte do sobrepreço vale também quando o valor é digitado como "valor fechado". Davi ainda não confirmou se quer manter assim.
- Lembretes da agenda só disparam com o app aberto ou usado há pouco (não há servidor).

## Próximos passos (da avaliação de 6/11)

### v3.0.1 — corrigir já
1. **Ponto de milhar vira centavos.** `parseBR` em `src/core/format.ts` lê "23.400" como 23,4. Tratar ponto seguido de 3 dígitos como milhar, como `parseMoney` em `src/core/csv.ts` já faz. Adicionar teste.
2. **Fio B (Lei 14.300).** Em 2026 o consumidor paga 60% do Fio B sobre a energia compensada, e o percentual sobe a cada ano. Criar em Ajustes o valor do Fio B (R$/kWh) e o percentual do ano, somar na conta nova em `calculate()` e citar na proposta. Adicionar teste.
3. **Conta em kWh ignora a iluminação pública.** Em `calculate()`, quando a conta vem em kWh, somar `lightingFee` também em `currentBill`. Adicionar teste.
4. **Lembrete de backup.** Avisar quando `settings.lastBackupAt` tiver mais de 7 dias.

### v3.1
- Botão "Adicionar ao Google Agenda" nos compromissos (o aviso chega com o app fechado).
- Comissão a receber somada no Painel.
- Reduzir fotos para cerca de 1600 px ao anexar.

### v3.2
- PDF com texto (hoje é imagem via html2canvas).
- Teste de ponta a ponta com Playwright dentro do repositório, rodando no `publicar`.
- Marcas de módulo e inversor editáveis em Ajustes.
- Folhas fecham com Esc e recebem o foco ao abrir.
- Dividir `src/screens/Ficha.tsx` (504 linhas).

## Em aberto com o Davi

- Apagar do histórico os commits com o código original exige reescrever o histórico do GitHub (force push). Só fazer se ele pedir.
- Confirmar a regra da comissão no valor fechado.
- Ele lembra de uma skill que analisa o código inteiro e mostra o resultado numa apresentação; ela não está na conta do claude.ai, provavelmente está no Claude Code do computador dele.
