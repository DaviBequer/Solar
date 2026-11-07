# Versões

## 3.0.4 — 6 de novembro de 2026

- Tabela de kits com o padrão de ligação (coluna Fase, opcional). O orçamento avisa quando o padrão do cliente não atende o kit.
- Novo cliente agora é um botão redondo só com ícone, no canto da tela.

## 3.0.3 — 6 de novembro de 2026

- Contrato em PDF para cada cliente: no orçamento da Ficha, "Gerar contrato" preenche os dados do cliente e do sistema. O app pede CPF ou CNPJ, nascimento e CEP, e guarda na ficha.
- Modelo de contrato importado em Ajustes. Ele fica só no aparelho e entra no backup.

## 3.0.2 — 6 de novembro de 2026

- Criar cliente abre a ficha. "Ver proposta em PDF", "Abrir no orçamento" e "Editar dados" não voltam mais para a tela errada.
- Proposta recusada não vira a atual nem conta como aberta. Orçamento de venda fechada só é apagado depois de desfazer a venda. Editar a proposta vendida atualiza a comissão calculada.
- A data e a validade da proposta não mudam mais ao trocar a situação.
- Restaurar backup agora é tudo ou nada: se o arquivo tiver problema, os dados atuais ficam intactos. A data do último backup só é gravada depois de o arquivo ser entregue.
- Juros e parcelas padrão chegam ao orçamento novo, e ajustes não alteram orçamento reaberto. Inversor que deixou de servir avisa. Mais e menos módulos não perdem o kit.
- PDF anexado abre sem imagem quebrada. Cliente só com GPS tem Rota também na Agenda. Rótulo "6kW" corrigido.

## 3.0.1 — 6 de novembro de 2026

- Valor digitado com ponto de milhar agora é lido certo: "23.400" vale 23 mil, não 23,4.
- Fio B (Lei 14.300) em Ajustes: valor por kWh e percentual do ano. Entra na conta nova e aparece na proposta. Começa em 0, sem efeito até ser preenchido.
- Conta informada em kWh agora inclui a iluminação pública na conta de hoje.
- Aviso no Orçamento quando o último backup tem mais de 7 dias, ou quando há dados e nenhum backup.

## 3.0.0 — 6 de novembro de 2026

Reescrita completa do app, no visual aprovado (layout Sol a Pino, cores azul-marinho e dourado).

- Orçamento novo: arco de cobertura, barra fixa com preço e botão de proposta, média de 12 meses, escolha de módulo, inversor, telhado, rede e tarifa.
- Cálculo refeito e testado: a economia desconta a taxa mínima da distribuidora; o retorno usa o valor realmente pago; juros de 0% funcionam; kit que não existe na tabela não pega mais o preço de outro kit em silêncio.
- O orçamento em andamento não se perde ao trocar de aba ou fechar o app; reabrir um orçamento salvo traz de volta módulo, baterias, parcelas, entrada e juros.
- Status do cliente escolhido direto (agora dá para marcar Perdido), fechamento de venda grava comissão e data da venda, e a comissão pode ser marcada como recebida.
- Ficha do cliente sem perda de dados: registros e anexos não se apagam mais um ao outro. Anexos guardados como arquivo.
- Agenda com botão para criar compromisso, visão de semana e mês, atrasados e próximos dias. Lembretes disparam com o app aberto ou usado há pouco.
- Painel com dados reais: comissão do mês pela data da venda, meta, negociação em aberto e conversão.
- Proposta em PDF em uma página A4, com envio pelo compartilhar do celular.
- Ajustes: logo e nome da empresa, parâmetros de cálculo, tabela de kits com importação e exportação de CSV, metas e backup (aceita o backup do app antigo).
- Versão ao lado da logo; o app instalado se atualiza sozinho.
