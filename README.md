# Abastecimento — SIR Motors

Réplica do site "Diário de Bordo" adaptada para registo de abastecimentos de combustível.
Interface responsiva para telemóvel e computador. Opera em modo demonstração
(armazenamento local no navegador) até que config.js receba os endereços
masterDataUrl (lista de viaturas/postos) e submissionUrl (recolha dos registos).

## Ficheiros
- index.html — estrutura do formulário
- styles.css — estilo (idêntico ao Diário de Bordo)
- config.js — endereços de integração (Power Automate / SharePoint)
- app.js — lógica do formulário e cálculo automático do Valor Total
- data/master-data.json — listas de apoio (viaturas, postos)

## Mapeamento para a tabela tbl_abastecimentos (Workbook_Operacoes_Rodoviarias_v1.xlsx, aba ABASTECIMENTOS)

Coluna na tabela Excel -> Campo no formulário (payload) -> Notas
Column1 -> (nao enviado) -> nome por defeito da tabela, nunca foi renomeada; sugestao: renomear para "Nr"
Data -> Data -> data do abastecimento
Viatura -> Viatura -> lista de viaturas (reaproveitada do Diario de Bordo)
Litros -> Litros -> litros abastecidos
Valor Unitario -> ValorUnitario -> preco por litro, em MZN
Valor Total -> ValorTotal -> coluna com formula no Excel (Litros x Valor Unitario); o formulario calcula e envia o valor tambem, mas o ideal e deixar o Excel recalcular
Posto -> Posto -> posto de abastecimento
KM -> KM -> quilometragem no momento do abastecimento

Quando ligares isto ao Power Automate (accao "Add a row into a table" sobre tbl_abastecimentos), usa este mapeamento.

