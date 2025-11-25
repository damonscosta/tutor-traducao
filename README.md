# 🇬🇧 Tutor de Tradução com IA

> Uma aplicação web interativa que utiliza Inteligência Artificial para auxiliar no aprendizado de inglês, fornecendo traduções contextuais e feedback gramatical personalizado.

![Status do Projeto](https://img.shields.io/badge/Status-Em_Desenvolvimento-yellow)
![Licença](https://img.shields.io/badge/License-MIT-blue)

## 🎯 Sobre o Projeto

O **Tutor de Tradução** não é apenas um tradutor. Ele foi desenvolvido para resolver uma dor comum de estudantes de idiomas: a falta de feedback imediato sobre suas tentativas de tradução.

A aplicação permite que o usuário estude textos em inglês, traduza trechos específicos ou o texto completo, e o mais importante: **submeta sua própria tradução para análise de uma IA**, recebendo correções e dicas como se fosse um professor particular.

### ✨ Funcionalidades Principais

* **Tradução Contextual (Popup):** Selecione qualquer palavra ou frase para ver a tradução imediata sem sair do contexto.
* **Feedback Inteligente (AI):** Integração com a **Google Gemini API** para analisar a tradução do usuário e explicar erros gramaticais ou sugerir melhorias de vocabulário.
* **Tradução de Texto Completo:** Integração com a **DeepL API** para traduções de alta precisão de grandes blocos de texto.
* **Text-to-Speech (TTS):** Prática de listening utilizando a Web Speech API nativa do navegador para ler o texto original.
* **Interface Adaptável:** Design responsivo com suporte a **Modo Escuro (Dark Mode)** para conforto visual.

## 🛠️ Tecnologias Utilizadas

Este projeto foi construído utilizando uma arquitetura moderna e limpa:

**Front-end:**
* ![HTML5](https://img.shields.io/badge/HTML5-orange?style=flat-square&logo=html5&logoColor=white)
* ![CSS3](https://img.shields.io/badge/CSS3-blue?style=flat-square&logo=css3&logoColor=white) (Variáveis CSS, Flexbox)
* ![JavaScript](https://img.shields.io/badge/JavaScript-yellow?style=flat-square&logo=javascript&logoColor=white) (ES6+, Fetch API, DOM Manipulation)

**Back-end:**
* ![Node.js](https://img.shields.io/badge/Node.js-green?style=flat-square&logo=node.js&logoColor=white)
* ![Express](https://img.shields.io/badge/Express-lightgrey?style=flat-square&logo=express&logoColor=black) (Proxy Server para segurança das chaves de API)
* **APIs Externas:** Google Gemini (Generative AI) e DeepL.

## 🚀 Como Rodar o Projeto

### Pré-requisitos
Antes de começar, você precisa ter instalado em sua máquina:
* [Node.js](https://nodejs.org/en/) (v18 ou superior)
* Chaves de API para o **DeepL** e **Google Gemini**.

### Instalação

1. **Clone o repositório**
   ```bash
   git clone [https://github.com/seu-usuario/tutor-traducao.git](https://github.com/seu-usuario/tutor-traducao.git)
   cd tutor-traducao


