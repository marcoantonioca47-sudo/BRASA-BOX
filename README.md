# 🍔 BRASABOX

Sistema web de pedidos para a BRASABOX, desenvolvido com HTML, CSS e JavaScript.

## ✨ Recursos

- Cardápio responsivo
- Carrinho de compras
- Entrega ou retirada
- Cálculo de taxa de entrega
- Pagamento via Pix, dinheiro e cartão
- Campo para troco
- Cupons de desconto
- Finalização do pedido via WhatsApp
- Área administrativa
- Gerenciamento de produtos
- Gerenciamento de pedidos e status
- Dashboard com indicadores
- Estrutura inicial de PWA

## 🚀 Publicação no GitHub Pages

1. Crie um repositório público no GitHub, por exemplo `brasabox`.
2. Envie os arquivos deste projeto para a branch `main`.
3. Acesse **Settings → Pages**.
4. Em **Build and deployment**, selecione **GitHub Actions**.
5. O workflow deste repositório fará o deploy automaticamente.

O site ficará em:

`https://SEU-USUARIO.github.io/brasabox/`

## 🗂️ Estrutura

```text
brasabox/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── assets/
│   └── icons/
├── app.js
├── index.html
├── manifest.json
├── style.css
├── sw.js
├── .gitignore
└── README.md
```

## ⚙️ Configuração

A versão atual é um protótipo front-end. Dados de produtos, pedidos e configurações são armazenados no `localStorage` do navegador.

Antes de usar em produção, recomenda-se adicionar:

- Backend e banco de dados
- Autenticação segura
- API para pedidos em tempo real
- Gateway de pagamento
- Integração oficial com WhatsApp
- Controle de acesso administrativo
- Variáveis de ambiente para dados sensíveis

### WhatsApp

O número de WhatsApp utilizado pelo projeto deve ser configurado no painel administrativo ou no arquivo de configuração correspondente. Não publique senhas, tokens ou chaves secretas no repositório.

## 📱 GitHub Pages

O projeto foi preparado para funcionar como site estático no GitHub Pages.

O deploy é feito pelo workflow:

`.github/workflows/deploy-pages.yml`

## 📄 Licença

Projeto privado/comercial da BRASABOX. Adapte esta seção caso queira publicar o código com uma licença específica.
