# Sonit

App de vendas de energia solar para usar no celular: monta o orçamento a partir da conta de luz, escolhe o kit pela tabela de preços, simula pagamento, gera a proposta em PDF e acompanha clientes, agenda e comissão.

Funciona como app instalável (PWA). Os dados ficam no próprio aparelho; use **Ajustes → Backup** para exportar uma cópia.

**Endereço:** https://davibequer.github.io/Solar/

## Telas

- **Orçamento**: conta de luz (R$, kWh ou média de 12 meses), arco de cobertura, tipo de sistema, módulos, inversor, telhado e rede, pagamento, valor e resultado para o cliente. A comissão fica escondida até você tocar no olho.
- **Clientes**: lista por status, busca, próximo passo de cada cliente e aviso de quem está sem contato.
- **Ficha do cliente**: status por seleção, WhatsApp, ligar, rota, próximo passo, endereço com GPS, orçamentos, registros e anexos. Fechar venda grava a comissão.
- **Agenda**: semana ou mês, compromissos do dia, atrasados, próximos dias e lembretes.
- **Painel**: comissão do mês, meta, negociação em aberto, conversão e vendas por mês.
- **Ajustes**: dados da proposta, parâmetros de cálculo, tabela de kits (importa CSV), metas e backup.

## Planilha de kits

CSV com as colunas `GM, 585, 610, 700, Inversor, Valor` (vírgula ou ponto e vírgula). GM é a geração média do kit em kWh por mês; 585, 610 e 700 são as quantidades de módulos de cada potência.

## Desenvolvimento

```bash
npm install
npm run dev       # abre em http://localhost:5173
npm test          # testes do motor de cálculo e do backup
```

## Publicar

```bash
npm run publicar              # sobe a versão (3.0.0 -> 3.0.1), testa, gera e publica
npm run publicar -- minor     # 3.0.1 -> 3.1.0
```

A versão aparece ao lado da logo no app e muda a cada publicação. O site é enviado para o ramo `gh-pages`; o app instalado se atualiza sozinho na próxima vez que for aberto.
