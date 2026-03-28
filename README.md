# Aeterna.ia — Interface de Chat

Interface web frontend da plataforma de orquestração de IA **Aeterna.ia**, desenvolvida pela **Consysencia**.

## Configuração Rápida

### 1. Configure o Webhook do n8n

Abra o arquivo `script.js` e localize a linha:

```js
const N8N_WEBHOOK_URL = 'https://SUA_URL_DO_WEBHOOK_DE_PRODUCAO_DO_N8N_AQUI';
```

Substitua pela URL real do seu webhook de produção no n8n.

### 2. Rode Localmente

**Opção A — VS Code Live Server (recomendado):**
1. Instale a extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) no VS Code.
2. Clique com o botão direito em `index.html` → **Open with Live Server**.
3. Acesse `http://127.0.0.1:5500` no navegador.

**Opção B — Python (sem instalação adicional):**
```bash
python -m http.server 8080
# Acesse http://localhost:8080
```

**Opção C — Node.js (`serve`):**
```bash
npx serve .
```

## Deploy no GitHub Pages

1. Crie um repositório no GitHub e envie os arquivos.
2. Vá em **Settings → Pages**.
3. Em "Source", selecione a branch `main` e pasta `/ (root)`.
4. Clique em **Save**. Seu site estará em `https://SEU_USUARIO.github.io/NOME_DO_REPO/`.

## Estrutura do Projeto

```
aeterna-ia/
├── index.html      # Estrutura HTML da interface
├── style.css       # Dark Mode técnico Consysencia
├── script.js       # Lógica de chat, Markdown e integração n8n
├── .gitignore
└── README.md
```

## Dependências (CDN — sem instalação)

| Biblioteca | Uso |
|---|---|
| [marked.js](https://marked.js.org/) | Renderização de Markdown |
| [highlight.js](https://highlightjs.org/) | Syntax highlighting em blocos de código |
| [Font Awesome](https://fontawesome.com/) | Ícones da interface |

## Formato da Resposta do n8n

O webhook deve retornar um JSON com a chave `reply`:

```json
{
  "reply": "Resposta em **Markdown** da IA aqui."
}
```
