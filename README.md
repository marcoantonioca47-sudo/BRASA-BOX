# 🔥 BrasaBox

Sistema web de pedidos da **BrasaBox**, preparado a partir da versão funcional do projeto anterior e separado para um novo ambiente.

## O que esta versão mantém

- Cardápio responsivo
- Carrinho de compras
- Entrega ou retirada
- Taxa de entrega por bairro
- Pix, dinheiro e cartão
- Troco
- Cupons e promoções
- Acompanhamento de pedidos
- Área administrativa
- Gerenciamento de produtos
- Gerenciamento de pedidos/status
- Área do motoboy
- Sincronização e atualização em tempo real
- Notificações
- PWA

## 🔐 Novo ambiente

Esta versão foi preparada para usar um **novo projeto Supabase**.

A configuração fica em:

`supabase-config.js`

Preencha somente:

- URL do novo projeto Supabase
- Publishable key do novo projeto

**Não coloque service_role key ou qualquer chave secreta no frontend.**

O projeto não deve reutilizar o banco de dados da versão antiga.

## 🚀 GitHub Pages

Repositório:

`marcoantonioca47-sudo/BRASA-BOX`

O deploy é feito pelo workflow:

`.github/workflows/deploy-pages.yml`

Depois de ativar o GitHub Pages em **Settings → Pages**, selecione **GitHub Actions** como fonte de publicação.

## 🗄️ Banco de dados

Os scripts SQL deste repositório devem ser executados somente no **novo projeto Supabase**, na ordem necessária para a instalação.

Arquivos principais:

- `supabase-schema.sql`
- `supabase-settings.sql`
- `supabase-realtime.sql`
- `supabase-hardening.sql`
- demais migrações específicas do sistema

Antes de colocar o sistema em produção, revise as políticas RLS e confirme que o administrador e os perfis possuem as permissões esperadas.

## ⚠️ Importante

O repositório contém versões históricas dos scripts que fizeram parte do desenvolvimento do sistema. O carregamento efetivo é definido pelo `index.html`.

Não apague scripts históricos de forma indiscriminada: primeiro confirme quais arquivos são carregados e quais funções dependem deles.

## 📱 Identidade

Nome atual do sistema: **BrasaBox**

Os identificadores internos históricos que começam com `bv_` foram preservados em alguns scripts para evitar quebrar funções existentes. Eles não significam que o sistema esteja conectado ao antigo Supabase.

## Licença

Projeto comercial da BrasaBox.
