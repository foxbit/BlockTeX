

# PRD Completo: BlockTeX IDE (Versão de Desenvolvimento Local)

## 1. Visão e Objetivos

Criar uma IDE Web que abstraia a complexidade do LaTeX para diagramação de livros profissionais, utilizando uma arquitetura de blocos isolados. O sistema deve rodar localmente no Ubuntu, aproveitando o compilador nativo do sistema operacional via uma ponte Node.js.

---

## 2. Arquitetura Técnica Detalhada

### 2.1 Stack Tecnológica

* **Frontend:** React/Vite (Interface reativa e gestão de estado dos blocos).
* **Conversor:** `unified.js` com plugins `remark` e `remark-latex` (Conversão MD → LaTeX no cliente).
* **Backend (Bridge):** Node.js/Express (Execução de comandos de sistema `pdflatex` ou `lualatex`).
* **Comunicação:** API REST local ou WebSockets para logs de compilação em tempo real.

### 2.2 Fluxo de Compilação Local

1. **Frontend** gera o arquivo `.tex` concatenando Preâmbulo + Pilha de Blocos.
2. **Frontend** envia o `.tex` e referências de imagens para o **Backend**.
3. **Backend** salva arquivos temporários e executa o binário do LaTeX instalado no Ubuntu.
4. **Backend** retorna o PDF gerado ou o log de erro detalhado para a IDE.

---

## 3. Configurações Globais (O Chassis do Livro)

Definem as propriedades imutáveis do documento no arquivo `\documentclass`.

| Parâmetro | Regra de Negócio | Implementação LaTeX Sugerida |
| --- | --- | --- |
| **Formato Físico** | Seleção de tamanhos padrão (A4, A5, 16x23cm) ou customizado. | `\geometry{papersize={width, height}}` |
| **Páginas Espelhadas** | Ativação obrigatória de `twoside` para livros impressos. | `\documentclass[twoside]{book}` |
| **Margens (Mirror)** | Margem interna (medianiz) maior que a externa para encadernação. | `\geometry{inner=25mm, outer=20mm}` |
| **Tipografia Global** | Definição da fonte principal, de cabeçalhos e tamanho base (ex: 11pt). | `\setmainfont{NomeDaFonte}` (LuaLaTeX) |
| **Sangria (Bleed)** | Offset global de 3mm para elementos que tocam a borda da página. | `\geometry{layoutsize={...}, layouthoffset=3mm}` |
| **Paginação** | Números de página sempre nas extremidades externas do espelhamento. | `\fancyfoot[LE,RO]{\thepage}` |

---

## 4. O Sistema de Blocos e Dados

### 4.1 Modelo de Dados (Arquivo .btx)

O projeto é salvo como um JSON estruturado:

```json
{
  "metadata": { "title": "...", "author": "..." },
  "global_setup": { "paper": "A5", "mirror": true, "font": "Inter" },
  "blocks": [
    {
      "id": "uuid",
      "type": "content",
      "content": "# Título\nTexto...",
      "style_id": "template_id",
      "style_variables": { "color": "#000", "padding": "20pt" },
      "config": {
        "toc_scan": { "from": 1, "to": 2 },
        "toc_visible": true,
        "page_break": "isolated" 
      }
    }
  ]
}

```

### 4.2 Lógica de Hierarquia e TOC (Índice)

* **Escaneamento Automático:** A IDE lê o Markdown do bloco e identifica níveis de `#`.
* **Mapeamento:** `#` vira `\chapter`, `##` vira `\section`, `###` vira `\subsection`.
* **Filtro de Captura:** O usuário define no painel do bloco qual profundidade de títulos deve ser "sugada" para o Índice Geral.
* **Visibilidade:** Flag `toc_visible` permite ignorar o bloco inteiro no índice, mesmo que tenha títulos.

---

## 5. Criação de Estilos (Templates de Bloco)

### 5.1 Anatomia do Template

Cada estilo é composto por:

1. **UI Schema (JSON):** Define quais controles (color pickers, sliders) aparecem na IDE para aquele bloco.
2. **LaTeX Wrapper:** O código que "envelopa" o conteúdo.
* **Placeholder:** `{{content}}` é onde o Markdown convertido é injetado.
* **Ambiente Isolado:** Uso de `\begin{customstyle} ... \end{customstyle}` para evitar vazamento de formatação.



### 5.2 Compatibilidade e Regras

* **Condicionais:** Uso de `\ifdef` para elementos opcionais (ex: se não houver imagem, o bloco não deixa espaço vazio).
* **Injeção de Pacotes:** Estilos declaram dependências (ex: `tikz`) que a IDE move para o preâmbulo global.

---

## 6. Lógica de Paginação e Layout Profissional

### 6.1 Consciência de Página (Odd/Even)

* **Alinhamento Dinâmico:** Blocos de depoimento ou imagens laterais devem usar `\ifoddpage`.
* **Página Ímpar:** Elemento alinha à direita.
* **Página Par:** Elemento alinha à esquerda.


* **Quebra de Bloco (Isolated):** Se a flag `page_break` for `isolated`, a IDE injeta `\cleardoublepage`, garantindo que o bloco comece sempre na página da direita (ímpar).

---

## 7. Gestão de Assets e Erros

### 7.1 Imagens e Arquivos

* **Pasta `/assets`:** Todas as imagens são copiadas para este diretório interno do projeto.
* **Sanitização de Nomes:** A IDE renomeia automaticamente arquivos (ex: "capa final.png" → "capa_final.png") para evitar quebra no LaTeX.

### 7.2 Tratamento de Erros de Compilação

* **Mapeamento de Linha:** O backend deve interceptar o log do LaTeX e tentar mapear o erro de volta para o ID do bloco que o gerou.
* **Fallback de Preview:** Caso a compilação completa falhe, a IDE mantém o Preview HTML (aproximação visual) ativo.


