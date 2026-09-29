# BrasaBox — novo projeto

Esta cópia foi separada do projeto antigo.

## O que foi isolado
- O antigo URL/chave do Supabase foi removido da configuração.
- Os arquivos que tinham URL do Supabase diretamente no JavaScript passaram a usar `supabase-config.js`.
- A documentação não aponta mais para o repositório antigo.
- A identidade textual foi alterada para BrasaBox.

## Próximos passos
1. Crie um NOVO repositório GitHub.
2. Crie um NOVO projeto Supabase.
3. No novo Supabase, execute os SQLs necessários deste pacote, começando por `supabase-schema.sql` e depois as migrações/configurações necessárias.
4. Edite `supabase-config.js` com a URL e a publishable key do NOVO Supabase.
5. Crie o usuário administrador no NOVO Supabase.
6. Só depois faça o deploy no NOVO GitHub.

## Importante
Os dados do Supabase antigo NÃO devem ser considerados como banco deste novo projeto.
A pasta ainda contém várias versões históricas de scripts (`*-v*.js`) porque elas fazem parte do pacote original; antes de uma nova publicação, vale consolidar quais arquivos realmente são carregados pelo `index.html`.
