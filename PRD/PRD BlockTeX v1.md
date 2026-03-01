

# PRD: BlockTeX IDE (Versão Final de Projeto)

**Visão do Produto:** Uma IDE Web baseada em blocos para diagramação de livros profissionais, que utiliza Markdown para escrita e LaTeX para renderização de alta fidelidade, eliminando a manipulação manual de layouts complexos.

---

## 1. Arquitetura e Estrutura do Sistema

### 1.1 Modelo de Dados (A Pilha de Blocos)

O projeto é tratado como uma lista ordenada de objetos JSON. Cada objeto representa um "módulo" do livro.

- **Armazenamento:** Os projetos são salvos em arquivos `.btx` (formato JSON).

- **Modos de Operação:** * **Nuvem:** Sincronização via banco de dados NoSQL.
  
  - **Local:** Acesso via *File System Access API* para salvar diretamente na pasta do usuário.

### 1.2 O Motor de Renderização

- **Conversor Intermediário:** Pandoc (converte o Markdown interno de cada bloco para LaTeX).

- **Compilador:** TeXLive via WebAssembly (WASM) para processamento no navegador ou servidor Dockerizado.

---

## 2. Requisitos Funcionais e Fluxo de Trabalho

### 2.1 Interface da IDE

- **Canvas Central:** Espaço para arrastar, soltar e reordenar blocos.

- **Editor de Bloco:** Campo de texto Markdown com suporte a variáveis do estilo.

- **Painel de Propriedades:** Ajustes finos de flags e variáveis específicas de cada bloco.

### 2.2 Lógica de Hierarquia e Índice (TOC)

Diferente de sistemas rígidos, a hierarquia no BlockTeX é baseada em **Escaneamento de Conteúdo**:

- **Regra de Captura:** O usuário define no painel do bloco qual a profundidade de cabeçalhos o índice deve "sugar" daquele bloco (Ex: Capturar de H1 a H3).

- **Mapeamento Automático:**
  
  - `#` no Markdown → `\chapter` (ou nível equivalente no LaTeX).
  
  - `##` no Markdown → `\section`.

- **Flag de Visibilidade:** Opção para o bloco inteiro ser ignorado pelo índice, mesmo que contenha títulos.

### 2.3 Gestão de Assets

- **Arquivamento:** Imagens são copiadas para uma pasta `/assets` dentro do projeto.

- **Sanitização:** Nomes de arquivos são limpos automaticamente para evitar erros de compilação no LaTeX (espaços para underscores, etc.).

---

## 3. Diretrizes para Criação de Estilos (Templates)

Para garantir que a biblioteca de estilos seja expansível e robusta, todos os templates devem seguir este padrão:

### 3.1 Anatomia do Template

1. **UI Schema (JSON):** Define quais campos aparecerão na IDE.
   
   - *Ex:* `{"id": "cor_fundo", "label": "Cor do Card", "type": "color"}`.

2. **LaTeX Wrapper:** O código que envolve o conteúdo transformado.
   
   - *Placeholder obrigatório:* `{{content}}` (onde o Markdown convertido será injetado).

3. **Ambiente Isolado:** Todo estilo deve usar ambientes LaTeX (`\begin{style}...\end{style}`) para evitar vazamento de formatação para blocos subsequentes.

### 3.2 Compatibilidade e Regras

- **Tratamento de Erros:** Se uma variável (como uma imagem) for opcional e não for preenchida, o estilo deve conter uma condicional LaTeX (`\ifdef`) para não quebrar a compilação.

- **Injeção de Pacotes:** O estilo deve declarar quais pacotes ele exige (ex: `tikz`, `tcolorbox`). A IDE agrupa essas dependências no preâmbulo global.

---

## 4. Paginação e Layout Profissional

O sistema deve tratar o livro como um objeto físico, não como um documento digital contínuo.

### 4.1 Páginas Espelhadas (Mirror Margins)

- **Configuração Twoside:** Ativação automática de margens internas (medianiz) maiores para encadernação.

- **Cabeçalhos Dinâmicos:** O estilo de página alterna o título do livro (página par/esquerda) e o título do capítulo (página ímpar/direita).

- **Numeração:** Números de página sempre nas extremidades externas do espelhamento.

### 4.2 Regras de Fluxo e Posicionamento

- **Consciência de Página (Odd/Even):** Blocos especiais (como imagens sangradas ou depoimentos laterais) devem usar a lógica `\ifoddpage`.
  
  - *Se Ímpar:* Elemento alinhado à direita.
  
  - *Se Par:* Elemento alinhado à esquerda.

- **Sangria (Bleed):** Estilos que ocupam a borda da página devem injetar automaticamente +3mm de margem técnica e marcas de corte.

- **Quebra de Bloco:**
  
  - *Flag Isolado:* Injeta `\cleardoublepage` (garante que o próximo bloco comece sempre na página da direita).
  
  - *Flag Mesclado:* Mantém o fluxo contínuo.

---

## 5. Estrutura de Saída (Output)

Ao clicar em "Processar PDF", a IDE executa:

1. **Geração do Preâmbulo:** Reúne configurações de margens, fontes globais e estilos de página espelhada.

2. **Montagem da Pilha:** Concatena os blocos seguindo as regras de hierarquia e paginação.

3. **Compilação:** O motor LaTeX gera o arquivo `.pdf`.

4. **Pacote de Exportação:** Opção de baixar o PDF final ou o "Source" (Pasta do projeto + arquivos `.tex` + imagens).

---
