🇺🇸 Tutor de Tradução (Meu Projeto de Estudos)
E aí! Esse é um projeto que eu criei para me ajudar a estudar inglês e, ao mesmo tempo, treinar programação. A ideia básica é ter um lugar onde eu possa colar textos em inglês, tentar traduzir e receber um feedback na hora.

Basicamente, é um "professor particular" de inglês usando Inteligência Artificial.

🤔 Por que eu fiz isso?
Eu queria uma ferramenta onde eu não precisasse ficar saindo da tela toda hora pra ir no Google Tradutor. Queria algo que me deixasse selecionar uma palavra e já ver o significado ali mesmo, e que também me dissesse se a minha tradução da frase completa estava boa ou não.

🛠️ O que eu coloquei no projeto
Fui implementando as coisas aos poucos e agora o projeto tem isso aqui:

Tradução rápida (Popup): Se você selecionar uma palavra ou frase no texto e clicar em "Traduzir Seleção", aparece um popup flutuante com a tradução. Dá até pra ouvir a pronúncia da palavra!

Professor IA (Gemini): Essa é a parte mais legal. Eu integrei com a API do Google Gemini. Quando você clica em "Checar Tradução", a IA lê o que você escreveu e te dá dicas de como melhorar, igual um professor corrigindo lição de casa.

Tradução Completa (DeepL): Se bater a preguiça ou dúvida, tem um botão que usa a API do DeepL pra traduzir o texto todo de uma vez com qualidade.

Modo Escuro: Porque ninguém merece ficar com a tela branca na cara de noite, né? Já deixei salvando a preferência no navegador.

Text-to-Speech: Dá pra ouvir o computador lendo o texto original em inglês pra treinar o listening.

💻 Como faz pra rodar?
Como eu usei umas APIs pagas/privadas (DeepL e Gemini), precisei criar um servidorzinho em Node.js pra esconder as chaves de segurança. Então não dá pra só abrir o HTML direto.

Baixa o projeto: Clona aí o repositório ou baixa os arquivos.

Instala as dependências: Abre o terminal na pasta e roda:

Bash

npm install
(Isso vai instalar o express, cors, dotenv e o node-fetch que eu usei).

Configura as chaves:

Cria um arquivo chamado .env na raiz (tem um .env.exemple lá pra ajudar).

Coloca suas chaves lá: DEEPL_KEY e GEMINI_KEY.

Roda o servidor:

Bash

npm start
Acessa: Abre o navegador em http://localhost:3000.

📝 Tecnologias que usei
Front: HTML simples, CSS (tentei deixar bonitinho com variáveis) e JavaScript puro (Vanilla JS).

Back: Node.js com Express (foi necessário pra fazer o proxy das APIs e não expor minhas chaves).