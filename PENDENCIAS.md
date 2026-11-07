# Onde paramos

Resumo da conversa em que o Sonit foi reescrito (5 e 6 de novembro de 2026), para continuar de onde parou.

## Estado atual

- **v3.0.6 publicada** em https://davibequer.github.io/Solar/ (ramo `gh-pages`, publicado com `npm run publicar`).
- Reescrita completa a partir do app gerado no Google AI Studio. Nada do código antigo é usado; os dois primeiros commits do histórico (`4e49732` e `5d65523`) ainda contêm o código original.
- Testes em `npm test`: cálculo, venda, proposta, links, navegação e backup de ponta a ponta.
- O fluxo inteiro foi testado num navegador em tamanho de celular (importar kits, orçar, criar cliente, gerar PDF, agendar, fechar venda, painel). Esse teste ficou fora do repositório.

## Decisões já tomadas

- Nome do app: **Sonit**, com um N. Repositório: `DaviBequer/Solar`.
- Visual: layout "Sol a Pino" com as cores do "Patrimônio" (azul-marinho e dourado), fonte Lexend. Telas aprovadas: Orçamento, Clientes, Ficha do cliente, Agenda, Painel, Ajustes, Proposta em PDF.
- A versão aparece ao lado da logo e sobe a cada publicação.
- Comissão: percentual sobre a venda + 50% do que passar do preço da tabela, menos imposto. Diferente do app antigo, a parte do sobrepreço vale também quando o valor é digitado como "valor fechado". Davi ainda não confirmou se quer manter assim.
- Lembretes da agenda só disparam com o app aberto ou usado há pouco (não há servidor).

## Próximos passos (da avaliação de 6/11)

### v3.0.1 — feita
- Ponto de milhar, Fio B, iluminação na conta em kWh e lembrete de backup.
- **Falta preencher o valor do Fio B** em Ajustes. Ele começa em 0, e até lá as propostas saem sem Fio B. Davi disse que vai resolver depois.

### v3.0.2 — publicada
- Correções da revisão de arquitetura de 6/11: navegação com folhas (`src/router.ts`), regras da venda (`src/core/sale.ts`), conteúdo da proposta (`src/core/proposal.ts`), backup tudo ou nada (`src/data/backup.ts`), edição do orçamento (`src/core/quote.ts`), anexos (`src/screens/attachments.tsx`) e links (`src/core/links.ts`).
- Decisões que faltam com o Davi:
  - **Iluminação pública:** trocar uma conta de R$ 680 de reais para kWh, com taxa de R$ 12, muda a conta de hoje para R$ 692 e a economia sobe R$ 12. Qual é a regra?
  - **Comissão a receber (v3.1):** somar o valor bruto, que é o salvo hoje, ou o líquido?
  - **Proposta antiga:** validade, logo e nome da empresa vêm dos ajustes atuais, não do dia da emissão. Fica assim?

### Contrato em PDF — publicado na v3.0.3
- O modelo fica fora do repositório, que é público: `modelo-contrato-sonit.txt`, na pasta acima do projeto. Importar em Ajustes em cada aparelho. **Nunca colocar esse arquivo nem dados de cliente no repositório.**
- Davi decidiu em 7/11 importar o modelo ele mesmo, em Word ou texto. O texto não entra no app porque traz CNPJ, sede e o nome do proprietário.
- Formato do modelo: `#` título, `##` seção, `>` recuo, `|` tabela, `_` linha de assinatura, `{{campo}}` dado automático. Campos aceitos em `FIELDS`, em `src/core/contract.ts`.
- Em aberto com o Davi: a tabela do modelo diz 15 anos no inversor e 30 nos módulos, e a cláusula 6.2 diz 12 para os dois. Falta decidir e ajustar o modelo. Vale revisão de advogado.

### Tabela de kits nativa
- `src/data/default-kits.csv`: 65 kits extraídos da tabela StartSun de março/abril de 2026, gravados na primeira abertura do app. Davi pediu assim, para teste. **Ao publicar, esses preços de outra empresa ficam públicos no repositório e no site.** Trocar pela tabela real antes do uso de verdade.
- A parcela de 72× da tabela equivale a 2,1% ao mês sem IOF nem spread. Com os padrões do app, a parcela sai maior. Falta o Davi confirmar a regra.
- Marcas de módulo da tabela (TSUN/DAH/ERA) não existem na lista do app; resolve com as marcas editáveis da v3.2.

### Leitura da fatura da Celesc — em avaliação
- PDF da fatura: dá para ler no aparelho, sem servidor, se tiver texto de verdade. Falta uma fatura real para confirmar o formato.
- Foto: leitura local é pouco confiável em tabela pequena; IA de imagem precisaria de um servidor para guardar a chave, e o app não tem. Sempre mostrar os valores para conferir antes de usar.

### v3.1
- Botão "Adicionar ao Google Agenda" nos compromissos (o aviso chega com o app fechado).
- Comissão a receber somada no Painel.
- Reduzir fotos para cerca de 1600 px ao anexar.

### v3.2
- PDF com texto (hoje é imagem via html2canvas).
- Teste de ponta a ponta com Playwright dentro do repositório, rodando no `publicar`.
- Marcas de módulo e inversor editáveis em Ajustes.
- Folhas fecham com Esc e recebem o foco ao abrir (entra em `useLayer`, em `src/router.ts`).

## Em aberto com o Davi

- Apagar do histórico os commits com o código original exige reescrever o histórico do GitHub (force push). Só fazer se ele pedir.
- Confirmar a regra da comissão no valor fechado.
- Ele lembra de uma skill que analisa o código inteiro e mostra o resultado numa apresentação; ela não está na conta do claude.ai, provavelmente está no Claude Code do computador dele.
