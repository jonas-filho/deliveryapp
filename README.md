# DeliveryApp — Guia de Instalação Completo

## O que você vai configurar

```
[Celular / Navegador]
        ↓
[Cloudflare Pages] → hospeda o app (frontend)
        ↓
[Cloudflare Workers] → processa as requisições (backend/API)
        ↓
[Cloudflare D1] → banco de dados (SQLite serverless)
```

Tudo gratuito no plano Free do Cloudflare.

---

## PASSO 1 — Instalar o Node.js

1. Acesse **https://nodejs.org**
2. Clique no botão verde **"LTS"** (versão recomendada)
3. Baixe e instale normalmente (próximo → próximo → instalar)
4. Após instalar, **feche e reabra** qualquer janela do terminal

---

## PASSO 2 — Abrir o Terminal

**Windows:**
- Pressione `Windows + R`
- Digite `cmd` e pressione Enter
- Uma janela preta vai abrir — é o terminal

**Mac:**
- Pressione `Cmd + Espaço`
- Digite `Terminal` e pressione Enter

---

## PASSO 3 — Instalar o Wrangler (ferramenta do Cloudflare)

No terminal, cole este comando e pressione Enter:

```
npm install -g wrangler
```

Aguarde terminar (pode demorar 1-2 minutos).

---

## PASSO 4 — Fazer login no Cloudflare pelo terminal

```
wrangler login
```

Uma janela do navegador vai abrir automaticamente.
Clique em **"Allow"** para autorizar.
Volte ao terminal — você verá a mensagem de sucesso.

---

## PASSO 5 — Criar o banco de dados D1

```
wrangler d1 create deliveryapp-db
```

O terminal vai mostrar algo assim:
```
✅ Successfully created DB 'deliveryapp-db'

[[d1_databases]]
binding = "DB"
database_name = "deliveryapp-db"
database_id = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
```

⚠️ **COPIE o `database_id`** — você vai precisar no próximo passo.

---

## PASSO 6 — Configurar o Worker

1. Abra a pasta `worker` que veio junto com este arquivo
2. Abra o arquivo `wrangler.toml` em qualquer editor de texto (Bloco de Notas funciona)
3. Substitua `COLE_O_ID_AQUI` pelo `database_id` que você copiou

O arquivo deve ficar assim:
```toml
name = "deliveryapp-api"
main = "index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "deliveryapp-db"
database_id = "sua-id-real-aqui"
```

4. Salve o arquivo

---

## PASSO 7 — Criar as tabelas no banco de dados

No terminal, entre na pasta `worker`:

**Windows:**
```
cd C:\caminho\para\deliveryapp\worker
```

**Mac:**
```
cd /caminho/para/deliveryapp/worker
```

> Dica: arraste a pasta `worker` para dentro do terminal — o caminho aparece automaticamente!

Agora rode este comando para criar as tabelas:
```
wrangler d1 execute deliveryapp-db --file=schema.sql
```

Você verá: `✅ Executed X queries`

---

## PASSO 8 — Publicar o Worker (API/backend)

Ainda na pasta `worker`, rode:

```
wrangler deploy
```

O terminal vai mostrar algo como:
```
✅ Deployed deliveryapp-api
https://deliveryapp-api.SEU_NOME.workers.dev
```

⚠️ **COPIE essa URL** — você vai precisar no próximo passo.

---

## PASSO 9 — Configurar a URL da API no frontend

1. Abra a pasta `frontend`
2. Abra o arquivo `index.html` em qualquer editor de texto
3. Encontre esta linha no início do arquivo (linha ~50):

```javascript
const API_BASE = 'https://deliveryapp-api.SEU_SUBDOMINIO.workers.dev';
```

4. Substitua pela URL real que apareceu no passo anterior:

```javascript
const API_BASE = 'https://deliveryapp-api.SEU_NOME.workers.dev';
```

5. Salve o arquivo

---

## PASSO 10 — Publicar o frontend no Cloudflare Pages

### Opção A — Pelo site do Cloudflare (mais fácil, sem terminal)

1. Acesse **https://dash.cloudflare.com**
2. No menu lateral, clique em **"Workers & Pages"**
3. Clique em **"Create application"**
4. Clique na aba **"Pages"**
5. Clique em **"Upload assets"**
6. Dê um nome ao projeto: `deliveryapp`
7. Clique em **"Select from computer"**
8. Selecione o arquivo `index.html` da pasta `frontend`
9. Clique em **"Deploy site"**

Em alguns segundos você receberá uma URL como:
```
https://deliveryapp.pages.dev
```

Pronto! Esse é o endereço do seu app. 🎉

---

## PASSO 11 — Testar o sistema

Acesse a URL do seu app e faça login com:

| Perfil | Nome | Senha |
|--------|------|-------|
| Administrador | Admin | admin123 |
| Vendedor | João Silva | joao123 |
| Vendedor | Ana Costa | ana123 |
| Entregador | Carlos Moto | carlos123 |
| Entregador | Pedro Moto | pedro123 |
| Apoio | Marcos Apoio | marcos123 |

> ⚠️ **Troque as senhas** após o primeiro acesso! Vá em Equipe → edite cada usuário.

---

## PASSO 12 — Configurar suas filiais reais

1. Faça login como **Admin**
2. Clique em **"Filiais"** no menu inferior
3. Edite ou exclua as filiais de exemplo
4. Cadastre suas filiais reais com os endereços corretos

---

## Como funciona a integração em tempo real

- Qualquer pedido cadastrado por um **vendedor** aparece automaticamente para o **administrador**
- O **administrador** designa um entregador e o pedido aparece na aba **"Minha Rota"** do entregador
- O app **atualiza automaticamente a cada 30 segundos**
- Para atualizar na hora, clique no botão 🔄 no topo do dashboard

---

## Adicionar o app na tela inicial do celular

**Android (Chrome):**
1. Acesse a URL do app no Chrome
2. Toque nos 3 pontinhos (⋮) no canto superior direito
3. Toque em **"Adicionar à tela inicial"**
4. Confirme — o app aparece como ícone na tela inicial

**iPhone (Safari):**
1. Acesse a URL do app no Safari
2. Toque no ícone de compartilhar (□↑) na barra inferior
3. Role para baixo e toque em **"Adicionar à Tela de Início"**
4. Confirme

---

## Limites gratuitos do Cloudflare

| Recurso | Limite gratuito |
|---------|----------------|
| Workers (requisições) | 100.000/dia |
| D1 (banco de dados) | 5 milhões de leituras/dia |
| D1 (armazenamento) | 5 GB |
| Pages (hospedagem) | Ilimitado |

Para uma loja com centenas de pedidos por dia, o plano gratuito é suficiente.

---

## Problemas comuns

**"command not found: wrangler"**
→ Feche e reabra o terminal após instalar o Node.js

**"Not authenticated"**
→ Rode `wrangler login` novamente

**"database_id not found"**
→ Verifique se colou o ID correto no `wrangler.toml`

**App abre mas não carrega dados**
→ Verifique se a URL da API está correta no `index.html`
→ Verifique se o Worker foi publicado com `wrangler deploy`

**"CORS error" no navegador**
→ O Worker já está configurado com CORS. Verifique se a URL no `index.html` não tem barra no final

---

## Suporte

Se travar em algum passo, anote exatamente a mensagem de erro que apareceu no terminal e peça ajuda no Claude com ela.
