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

## Configuração para APK / WebView

Quando o app roda fora do Netlify (ex.: APK ou WebView), as funções `/.netlify/functions/*` não existem. Nesse caso, abra a seção **Configurações** dentro do app e salve:

1. `Jamendo Client ID`
2. `YouTube API Key`

Essas chaves ficam em `localStorage` e o app usa diretamente as APIs oficiais, evitando o erro 500 causado pela ausência das variáveis de ambiente no servidor.

## Gerar APK (TWA)

Um caminho simples é empacotar o PWA com uma **Trusted Web Activity** usando o Bubblewrap:

1. Instale Node.js LTS, Java 17+ e o Android SDK (com `ANDROID_HOME` configurado).
2. Instale o Bubblewrap:
   ```bash
   npm install -g @bubblewrap/cli
   ```
3. Gere o projeto TWA apontando para a URL publicada do PWA:
   ```bash
   bubblewrap init --manifest https://SEU-DOMINIO/manifest.json
   ```
4. Compile o APK:
   ```bash
   bubblewrap build
   ```

O resultado estará em `app-release.apk`. Para testes rápidos, também é possível gerar um APK debug com `bubblewrap build --debug`.
