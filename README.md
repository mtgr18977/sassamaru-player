# Sassamaru Player

Sassamaru Player é um PWA para streaming de áudio integrando YouTube, Jamendo e Podcasts.

## Configuração de Deploy (Netlify)

Para que o aplicativo funcione corretamente no Netlify, você deve configurar as seguintes variáveis de ambiente no painel do Netlify (**Site settings > Build & deploy > Environment > Environment variables**):

1. `JAM_CLIENT_ID`: Sua Client ID da API do Jamendo.
2. `YT_API_KEY`: Sua Chave de API do YouTube Data API v3.

O aplicativo utiliza **Netlify Functions** para realizar as chamadas de API de forma segura, evitando a exposição das suas chaves no código cliente.

## Desenvolvimento Local

Se estiver desenvolvendo localmente, você pode usar o [Netlify CLI](https://docs.netlify.com/cli/get-started/) para simular as funções:

```bash
netlify dev
```
