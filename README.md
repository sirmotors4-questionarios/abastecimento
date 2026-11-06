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


## Postos de abastecimento — origem exclusiva no Excel

O ComboBox **Posto** é alimentado apenas pelos valores distintos e não vazios
da coluna `Posto` da tabela `tbl_abastecimentos` no livro
`/General/Operações/Workbook_Operacoes_Rodoviarias_v1.xlsx`.

O formulário lê `data/master-data.json`, actualizado por
`.github/workflows/sync-master-data.yml`. Para a actualização automática,
o fluxo Power Automate responsável pela sincronização dos dados mestre deve:

1. Usar **List rows present in a table** (Excel Online Business) para obter
   os registos de `tbl_abastecimentos`, activando **Paginação** e definindo
   um limite apropriado ao volume da tabela.
2. Na acção **HTTP** que chama a API de GitHub `repository_dispatch`,
   acrescentar `abastecimentos` ao `client_payload` com o valor
   `body('Listar_Abastecimentos')?['value']` (ajustar ao nome real da acção),
   mantendo `viaturas` e `actualizadoEm`.
3. Confirmar que a execução da GitHub Action termina com sucesso. O ficheiro
   `data/master-data.json` passará a conter `postos` deduplicados e ordenados.

Exemplo da estrutura da mensagem para `repository_dispatch`
(substituir os dados exemplificativos; não colocar token no JSON do repositório):

```json
{
  "event_type": "sync-master-data",
  "client_payload": {
    "viaturas": [],
    "abastecimentos": [
      {"Posto": "Posto A"},
      {"Posto": "Posto B"},
      {"Posto": "Posto A"}
    ]
  }
}
```

O exemplo produzirá dois postos; nenhuma lista está codificada no site.
**A inclusão de um novo posto através de OUTRO não actualiza por si só
o ficheiro JSON**: o nome passa a integrar o ComboBox dos dispositivos
depois de ser gravado no Excel e executada a sincronização.

**Nota:** a GitHub Action só consulta os dados recebidos no evento;
não possui acesso directo ao Excel SharePoint. A alteração do fluxo de
sincronização no Power Automate é indispensável.
