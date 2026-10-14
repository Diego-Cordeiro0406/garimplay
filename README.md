# 🎮 Garimplay

**Jogos bons. Preços melhores.**

O **Garimplay** é uma plataforma de curadoria de promoções de **jogos em mídia física**. A proposta é reunir ofertas de diferentes lojas em um só lugar, facilitando a descoberta de bons preços para quem gosta de jogar e colecionar.

## Funcionalidades

- **Catálogo de ofertas:** exibição das promoções publicadas, ordenadas pelas mais recentes.
- **Filtros por plataforma:** PlayStation (PS4 e PS5), Nintendo (Switch e Switch 2), Xbox (One e Series) e outras.
- **Detalhes da promoção:** preço atual e original, desconto percentual, loja, descrição e link para a oferta.
- **Cupons e condições:** exibição de código promocional com opção de copiar, condições de pagamento, regras e prazo de validade, quando disponíveis.
- **Ofertas expiradas:** páginas de detalhes podem continuar acessíveis, com indicação de expiração.
- **Interface responsiva:** adaptação para celulares, tablets e desktops.
- **PWA:** manifesto e ícones para instalação em dispositivos compatíveis.
- **Estados de interface:** carregamento, erro e ausência de resultados.

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 19, TypeScript 6, Vite 8 |
| Estilização | Tailwind CSS 4, componentes shadcn/ui, Lucide React |
| Navegação | React Router 7 |
| Dados e cache | TanStack Query 5 |
| Backend e banco | Supabase, PostgreSQL |
| Aplicação instalável | vite-plugin-pwa |
| Qualidade de código | ESLint |

## Como executar localmente

### Pré-requisitos

- Node.js compatível com o Vite 8 (versão **20.19+ ou 22.12+**, conforme os requisitos do Vite; recomenda-se uma versão LTS atual).
- npm.
- Projeto Supabase configurado com as tabelas e políticas de acesso necessárias.

### 1. Clone o repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd <NOME_DA_PASTA>
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```dotenv
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
```

As informações podem ser obtidas no painel do Supabase, nas configurações de API do projeto.

> **Segurança:** utilize apenas a chave pública (*publishable key*) no frontend. **Nunca** exponha a `service_role` ou outras chaves secretas em variáveis `VITE_*`. O acesso aos dados deve ser protegido pelas políticas de **Row Level Security (RLS)** do Supabase.

### 4. Inicie o ambiente de desenvolvimento

```bash
npm run dev
```

Abra o endereço exibido pelo Vite no terminal.

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Executa a verificação TypeScript e gera o build de produção |
| `npm run preview` | Pré-visualiza o build de produção |
| `npm run lint` | Executa o ESLint |

## Estrutura do projeto

```text
src/
├── components/
│   ├── deals/              # Cards de ofertas e cupons
│   ├── ui/                 # Componentes reutilizáveis de interface
│   └── MainLayout.tsx      # Cabeçalho, conteúdo e rodapé
├── data/
│   └── mockDeals.ts        # Dados de exemplo legados
├── hooks/
│   └── useDeals.ts         # Hooks de consulta com TanStack Query
├── integrations/
│   └── supabase/
│       ├── client.ts       # Cliente Supabase
│       └── types.ts        # Tipos do banco de dados
├── lib/                    # Formatação e utilitários
├── pages/                  # Páginas e rotas
├── services/
│   └── deals.ts            # Consultas e mapeamento de ofertas
├── types/
│   └── deal.ts             # Tipos de domínio
└── App.tsx                 # Configuração de rotas e QueryClient

public/
├── icons/                  # Ícones do PWA
└── favicon.svg
```

## Rotas

| Rota | Descrição |
| --- | --- |
| `/` | Catálogo de ofertas publicadas |
| `/ofertas/:id` | Detalhes de uma oferta |
| `/admin/login` | Página reservada para o login administrativo (**ainda não implementada**) |
| `*` | Página não encontrada |

## Integração com Supabase

A aplicação utiliza as seguintes tabelas:

| Tabela | Responsabilidade |
| --- | --- |
| `deals` | Ofertas, preços, links, cupons, validade e status |
| `stores` | Lojas vinculadas às ofertas |
| `platforms` | Plataformas dos jogos |
| `user_roles` | Identificação de usuários administradores |

O serviço `src/services/deals.ts` consulta ofertas e seus relacionamentos com lojas e plataformas. Os dados são convertidos para o tipo `Deal` utilizado pelos componentes React. Os hooks em `src/hooks/useDeals.ts` gerenciam o carregamento e o cache.

**Regras de visibilidade:** o feed público consulta ofertas com status `published`; a página de detalhes permite `published` e `expired`. Ofertas em `draft` não devem ser expostas publicamente. Essas restrições precisam ser reforçadas pelas políticas RLS no banco, não apenas pelos filtros do frontend.

**Configuração do banco:** este repositório, na versão analisada, **não inclui migrações SQL versionadas**. Para executar o projeto com um Supabase próprio, é necessário configurar previamente o esquema, os relacionamentos, as políticas RLS e os dados básicos de lojas e plataformas. Recomenda-se adicionar migrações em `supabase/migrations/` antes de disponibilizar um processo de instalação reproduzível.

## PWA

O Garimplay utiliza `vite-plugin-pwa`, com manifesto, ícones e atualização automática do service worker. A instalação depende do suporte do navegador e das condições exigidas para PWAs, como HTTPS em produção.

## Próximos passos

- [ ] Implementar autenticação e área administrativa.
- [ ] Criar fluxo administrativo de cadastro, edição e expiração de ofertas.
- [ ] Adicionar pesquisa por título e filtros avançados.
- [ ] Implementar paginação e filtros no banco para catálogos maiores.
- [ ] Versionar o esquema do Supabase com migrações.
- [ ] Adicionar testes automatizados.

## Aviso sobre as ofertas

O Garimplay funciona como um catálogo de promoções e direciona visitantes às lojas responsáveis pelas vendas. **Preços, estoque, cupons e condições podem mudar sem aviso prévio.** Confira as informações na loja antes de finalizar uma compra.

---

**Garimplay** — feito para quem gosta de colecionar jogos.
