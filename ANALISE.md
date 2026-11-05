# Sonit — diagnóstico da versão do Google AI Studio

O Sonit é um app de vendas de energia solar para o vendedor em campo: monta o orçamento a partir da conta de luz, escolhe o kit pela tabela de preços, simula pagamento, gera a proposta em PDF e acompanha clientes, agenda e comissão. Tudo fica no próprio celular (IndexedDB), sem servidor.

Esta análise cobre o código como veio do AI Studio (commit `Código original`). Ela é a base da reescrita.

## Erros que afetam números ou apagam dados

1. **A ficha do cliente salva por cima de uma cópia antiga.** Registros, anexos e o salvamento automático usam o cliente como ele era quando a ficha abriu (`{...lead}`), não o estado atual. Adicionar um registro depois de anexar uma foto apaga a foto do banco, e vice-versa.
2. **Mudar o status de um orçamento joga o cliente de volta para "Em negociação".** `ProposalService.save` força `status = 'Em Negociação'` em todo salvamento, inclusive quando o orçamento é marcado como Aprovado ou quando o cliente já é Vendido.
3. **O Painel ignora a comissão definida no fechamento da venda.** Ele lê `p.commissionValue`, campo que não existe em `SavedProposal`. O valor certo está em `commissionData.value`. Resultado: comissão manual nunca aparece; o Painel sempre recalcula pela porcentagem.
4. **"Economia mensal" mostra o valor da conta inteira.** A tela de resultado e o PDF recebem `currentBillValue` como economia. Além disso, nenhum cálculo desconta a taxa mínima da distribuidora (30, 50 ou 100 kWh conforme a rede) nem a iluminação pública. A economia fica superestimada e o retorno, otimista demais.
5. **Preço errado quando o kit não existe na tabela.** Com quantidade manual de módulos e sem kit correspondente, o app reaproveita em silêncio o preço do último kit válido (`lastValidPriceRef`), que pode ser de outro tamanho de sistema. No modo automático, se a conta for maior que o maior kit, o preço vira R$ 0 sem aviso.
6. **Reabrir um orçamento perde dados.** Não são salvos: potência do módulo escolhida (585/610/700 W), quantidade de baterias, número de parcelas, entrada e taxa de juros.
7. **Editar um orçamento salvo cria uma cópia** sempre que o consumo muda; só atualiza o mesmo registro se o consumo for idêntico.
8. **Juros de 0% quebram a parcela** (divisão por zero, aparece `NaN`).
9. **Trocar de aba apaga o orçamento em andamento.** A tela de orçamento é desmontada ao ir para Clientes, e ao voltar recarrega a última proposta aberta pelo CRM (`pendingProposal` nunca é limpo), por cima do que você estava fazendo.

## Funcionalidades que não funcionam

10. **Status do cliente por toque cíclico** (Novo → Negociação → Vendido → Perdido). Para chegar em Perdido é preciso passar por Vendido, que abre o fechamento de venda. Na prática não dá para marcar um cliente como perdido.
11. **Lembretes da agenda nunca disparam.** O app pede permissão de notificação e salva "1 hora antes", mas não existe código que envie a notificação.
12. **A Agenda não cria compromissos.** Só é possível agendar pela ficha do cliente.
13. **Comparação de cenários é inalcançável.** A tela existe, mas nenhum botão adiciona cenários. `FloatingActions` tem botões sem ação.
14. **Configurações não salvam.** Nome do app e perfil (vendedor/integrador) somem ao fechar; o tema escuro não tem botão; o "custo de plataforma" pode ser editado, mas não entra no cálculo (o cálculo usa as regras de híbrido).
15. **Painel com dados de enfeite.** A barra "Em negociação" é fixa em 45%; o filtro de ano vai só de 2023 a 2026; o faturamento conta pela data em que o orçamento foi criado, não pela data da venda.
16. **Botão "…" da lista de clientes** só recarrega a lista.

## Problemas técnicos

- **O TypeScript não verifica nada.** `@types/react` não está instalado, então todo componente é `any` e o `tsc` "passa". Instalando os tipos aparecem 6 erros reais: o do item 3 e cinco usos de um `annualSavings` que não existe em `ComparisonView`.
- **Tailwind e html2pdf por CDN.** O Tailwind via CDN não é para produção e não funciona offline na primeira carga; o html2pdf vem da CDN na versão 0.10, enquanto o `package.json` declara 0.14 (que nem é usado).
- **`index.html` carrega `index.tsx` duas vezes** e aponta para um `/index.css` que não existe.
- **Service worker "cache primeiro" para tudo.** Depois de instalado, o app pode continuar servindo a versão antiga indefinidamente.
- **Fotos em base64 dentro do registro do cliente.** O banco e o backup JSON crescem rápido; uma foto de conta de luz de 3 MB vira ~4 MB de texto.
- **Componentes enormes misturando cálculo e tela** (`LeadDetailsModal` 805 linhas, `BudgetGenerator` 774). O cálculo financeiro não tem como ser testado isoladamente.
- **Seleção de texto bloqueada no app inteiro**, o que impede copiar telefone, endereço ou valor.
- O README ainda pede `GEMINI_API_KEY`, que o app não usa.

## Direção da reescrita

- **Motor de cálculo separado e testado**: dimensionamento com margem, taxa mínima por tipo de rede, escolha de kit, preço (tabela, manual, fixo), desconto/ancoragem, financiamento (com juros 0%), retorno e comissão. Uma função pura, com testes cobrindo os casos acima.
- **Dados**: mesmo IndexedDB, com migração automática do banco atual (`SonitDB`) e compatibilidade com os backups já exportados. Fotos guardadas como arquivo (Blob), não base64.
- **Orçamento como rascunho persistente**: trocar de aba não perde nada; reabrir restaura tudo.
- **Status do cliente por seleção direta** e fechamento de venda que grava comissão e data da venda.
- **Agenda com criação direta** e lembretes. Observação honesta: num PWA sem servidor, o lembrete só dispara com o app aberto ou em segundo plano recente; notificação garantida com o app fechado exige um servidor de push, que pode entrar numa fase seguinte.
- **Build de produção** com Vite + Tailwind compilado, PDF por dependência local e service worker que atualiza sozinho.

As telas da nova versão estão sendo definidas em 5 propostas visuais; a escolhida vira o padrão da reescrita.
