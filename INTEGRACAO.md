# Integração Pelando → Garimplay

Preparada sobre o ZIP do Garimplay e o esquema SQL fornecido em 16/10/2026. Não foi aplicada a um projeto Supabase nem publicada. A interface compila; navegação real com sua sessão administrativa e comportamento no Supabase hospedado precisam ser conferidos após instalação.

## Primeiro passo: aplicar a migration

No SQL Editor do seu projeto Supabase, execute **somente**:

`supabase/migrations/20261016120000_imported_offers.sql`

Esse arquivo cria `imported_offers`, seu índice e trigger, RLS de leitura administrativa e três funções: recebimento, revisão e conversão em rascunho. Depende de `deals`, `stores`, `platforms`, `auth.users`, `is_admin()` e `set_updated_at()` já existentes e da coluna `deals.coupon_url`. Não recria nem altera as tabelas existentes.

A migration não é para executar repetidamente. Se você usa o Supabase CLI com histórico de migrações, registre/aplique por esse fluxo em vez de executar outra vez no SQL Editor. Não use `tests/fixtures/existing-schema.sql`: esse é um banco simulado usado exclusivamente pelos testes locais.

Depois, confira no Table Editor se a tabela `imported_offers` apareceu. Ela começa vazia. Somente usuários autenticados que passam em `is_admin()` podem ler suas importações. Usuários comuns e visitantes não têm acesso. A função de recebimento é executável apenas por `service_role`; a revisão e a conversão exigem administrador dentro da função.

## Segundo passo: disponibilizar o endpoint

1. Cadastre no servidor Supabase o segredo `OFFERS_INGEST_SECRET`, gerado aleatoriamente com pelo menos 32 caracteres. Não coloque o valor no frontend nem em arquivos versionados.
2. Publique a função `supabase/functions/ingest-offers` no seu projeto. O código usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` disponíveis no ambiente servidor.
3. A configuração está em `supabase/config.toml`: `verify_jwt=false` para esta função. Isso permite autenticação de máquina pelo cabeçalho `x-ingest-key`; a função compara o segredo obrigatório antes de ler/processar ofertas. Sem configuração válida retorna 503; chave ausente/incorreta retorna 401. Não use uma função sem a validação própria.

Com o CLI já vinculado/configurado ao seu projeto, o comando é:

```bash
supabase functions deploy ingest-offers --project-ref SEU_PROJECT_REF --no-verify-jwt
```

Endpoint esperado: `https://SEU_PROJECT_REF.supabase.co/functions/v1/ingest-offers`.

A função aceita `POST` JSON com `{"offers": [...]}`, de uma a cinquenta ofertas. Valida origem Pelando, IDs, título, preço em centavos, datas e URLs HTTPS. Não visita links nem executa HTML recebido. O lote é persistido de forma atômica pela função SQL. O segredo da integração é distinto da chave administrativa do Supabase; o coletor recebe apenas o primeiro.

## Terceiro passo: atualizar o frontend

O pacote contém o projeto completo atualizado, sem dependências instaladas. Também há um patch separado para comparar/aplicar sobre a versão do ZIP original. Se seu código já mudou desde o ZIP, revise o patch antes de incorporar; não substitua alterações posteriores por esta cópia.

```bash
npm ci
npm run build
```

Use as mesmas variáveis públicas de Supabase do seu projeto (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) e a configuração existente de imagens. Nenhum segredo da integração usa prefixo `VITE_`.

A nova entrada **Importações** aparece no admin e possui filtros Pendentes, Descartadas e Convertidas. A lista mostra os dados recebidos, links e evidências, com paginação de vinte itens. Descartar é reversível pela ação Restaurar.

Em **Revisar e criar rascunho**, o formulário existente abre com título, preço, URL e imagem. Loja e plataforma são sugeridas quando há correspondência exata e inequívoca com opções já cadastradas. Os IDs da loja no Pelando não são utilizados como UUIDs do Garimplay. Confirme edição/plataforma, embalagem, condições, preço e seu link de afiliado; complete os campos que faltarem.

O salvamento cria obrigatoriamente um rascunho e abre a edição da oferta criada. Publique depois pelo fluxo normal. Cliques repetidos na conversão retornam o mesmo rascunho; a associação e o INSERT ocorrem na mesma transação. Se o rascunho criado for removido, o registro da importação permanece convertido e não é recriado silenciosamente.

A imagem remota é mantida como URL por padrão. É possível usar o upload existente para substituí-la. Não há download automático para R2. A validação do formulário continua exigindo preço maior que zero, embora seu banco aceite zero; ofertas gratuitas exigem revisão e não alteramos essa regra nesta entrega.

## Quarto passo: conectar o coletor

O diretório `collector/` contém o coletor atual, verificadores e o novo `enviar_importacoes.py`. Requer Python 3.10 ou superior; não usa pacotes externos.

Configure **no ambiente do processo do coletor**:

- `GARIMPLAY_INGEST_URL`: URL HTTPS da função publicada.
- `GARIMPLAY_INGEST_SECRET`: mesmo valor do segredo `OFFERS_INGEST_SECRET` do servidor.

Não envie os valores no chat. O Python lê variáveis do ambiente; não carrega `.env` automaticamente.

No diretório `collector/`:

```bash
python3 buscar_jogos.py --hours 24 --pages-per-query 3 --output coleta-001.json --state historico-buscas.json
python3 verificar_midia.py --input coleta-001.json --output verificacao-001.json --limit 10
python3 enviar_importacoes.py --input coleta-001.json --verification verificacao-001.json --queue entregas.sqlite
```

Escolha nomes novos para relatórios e mantenha os arquivos de histórico e fila entre execuções. O nome de coleta usado em `--input` deve corresponder ao `input_report` da verificação. A verificação é opcional: se omitida, a importação permanece para revisão sem evidência da loja. Mesmo com verificação, falhas de acesso não descartam a oferta. Exclusão explícita de conteúdo digital sem embalagem impede o enfileiramento. Code in box com caixa física é permitido.

O limite de verificação é dez candidatos por relatório; os demais continuam sem confirmação. Identificar o formato não comprova preço final, vendedor, disponibilidade ou cupom.

Para preparar a fila sem transmitir:

```bash
python3 enviar_importacoes.py --input coleta-001.json --verification verificacao-001.json --queue entregas.sqlite --queue-only
```

Para retomar entregas pendentes sem repetir a coleta:

```bash
python3 enviar_importacoes.py --queue entregas.sqlite
```

A fila SQLite é separada do histórico de coleta. Uma revisão só é marcada entregue quando a resposta confirma origem, ID e horário enviados. Uma falha deixa a revisão pendente, retorna código de saída 1 e interrompe as tentativas da execução. Execute novamente após resolver a falha; não existe serviço de repetição ou agendamento nesta entrega. Preservar a fila e os relatórios evita perder uma coleta já registrada no histórico.

Evite execuções concorrentes sobre os mesmos arquivos. Uma falha depois de o servidor salvar, mas antes da confirmação chegar, pode provocar reenvio; o banco elimina a duplicação pelo par `(source, external_id)`. Coletas antigas não sobrescrevem revisões mais novas. Uma verificação posterior da mesma coleta pode enriquecer seus dados, desde que o restante do conteúdo corresponda e o horário de verificação seja mais recente.

## O que é preservado

Reenvios alteram apenas o JSON da fonte e o horário de coleta. Não alteram estado de revisão, decisão de descarte, associação ao rascunho ou campos editados em `deals`. Uma nova coleta não publica nem atualiza automaticamente uma oferta já criada. A revisão pode ser feita pelo admin mesmo quando a loja exigir login ou não disponibilizar dados ao extrator.

A janela de 24 horas usa `firstApprovedAt` e estado ativo no Pelando. Não monitora o encerramento de ofertas já importadas. Filtros e acessos das lojas mantêm as limitações da validação anterior: KaBuM teve confirmação real; Mercado Livre teve confirmação no navegador, com acesso HTTP bloqueado; Shopee permaneceu sem confirmação real.

## Verificações realizadas

- Compilação TypeScript/Vite/PWA concluída.
- ESLint passou nos arquivos frontend alterados.
- Tipagem da função nova validada com um shim mínimo do Deno e o SDK instalado; isso não substitui execução no runtime hospedado.
- Testes locais com PostgreSQL embarcado (PGlite), usando fixture baseada no esquema fornecido: migração, permissões de roles/RLS, bloqueio de não administradores, lote atômico, reenvios, revisão antiga, preservação de descarte/campos editados, enriquecimento por verificação e conversão idempotente em rascunho.
- Testes de validação de payload e segredo da função.
- 31 testes Python do coletor/verificadores/fila passaram. Quatro candidatos reais foram enfileirados em modo local, sem transmissão.
- Não houve conexão ao seu Supabase, execução da Edge Function hospedada ou teste visual da tela com sua sessão real. Não foi feito deploy nem agendamento.

Para reproduzir os testes, com Node 22.21+ e Python 3.10+:

```bash
npm ci
npm run test:imports
npm run check:ingest
npm run build
python3 -m unittest discover -s collector -v
```

Após instalar, faça um teste completo: enviar uma oferta, conferir a lista no admin, convertê-la em rascunho, reenviar a mesma oferta e confirmar que a contagem e o rascunho continuam únicos. Também confira o acesso negado com um usuário não administrador.
