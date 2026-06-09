import { BLOCK_TYPES, PAPER_SIZES } from './blockTypes.js';

// ============================================================
// Remove emojis e símbolos pictográficos que o pdflatex não suporta.
// IMPORTANTE: não remover caracteres latinos acentuados (á, ã, é, etc.)
// ============================================================
function stripEmojis(str) {
    if (!str) return str;
    return str
        // Planos suplementares: U+10000–U+10FFFF (emojis, símbolos extras)
        // Requer flag 'u' para funcionar com surrogate pairs
        .replace(/[\u{10000}-\u{10FFFF}]/gu, '')
        // Bloco de Emoticons e Símbolos Miscelâneos no BMP (cuidado: não usar ranges amplos!)
        // Apenas os blocos confirmados de emoji/pictogramas:
        .replace(/[\uD800-\uDFFF]/g, '')   // Surrogate halves soltos
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '') // Emojis estendidos (redundante com linha 1, mas seguro)
        // Variation selectors (modificadores de emoji, invisíveis mas problemáticos)
        .replace(/[\uFE00-\uFE0F]/g, '');
}

// ============================================================
// Escapa caracteres LaTeX especiais (EXCETO math modes)
// ============================================================
function escapeLatex(str, insideMath = false) {
    if (insideMath) return str; // Não escapar dentro de math
    str = stripEmojis(str);
    return str
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/#/g, '\\#')
        .replace(/\^/g, '\\^{}')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/</g, '\\textless{}')
        .replace(/>/g, '\\textgreater{}');
    // Não escapamos $ _ { } pois são usados em math inline
}

// Escapa apenas para uso em argumentos de comandos LaTeX (títulos, etc.)
function escapeLatexTitle(str) {
    str = stripEmojis(str);
    // IMPORTANTE: '\\' deve ser escapado PRIMEIRO — caso contrário os
    // escapes seguintes re-introduzem '\\' que seria re-processado.
    return str
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/#/g, '\\#')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/</g, '\\textless{}')
        .replace(/>/g, '\\textgreater{}');
}


// ============================================================
// Converte inline HTML (saída do TipTap) para LaTeX
// ============================================================
function inlineHtmlToLatex(html) {
    if (!html) return '';
    let t = stripEmojis(html);

    // Entidades HTML
    t = t.replace(/&amp;/g, '&')
         .replace(/&lt;/g, '<')
         .replace(/&gt;/g, '>')
         .replace(/&quot;/g, '"')
         .replace(/&apos;/g, "'")
         .replace(/&#39;/g, "'")
         .replace(/&nbsp;/g, ' ');

    // Inline tags → LaTeX (processar antes de escapar)
    // Protege conteúdo de tags para não escapar os comandos LaTeX
    const placeholders = [];
    const protect = (latex) => {
        placeholders.push(latex);
        return `\x00PH${placeholders.length - 1}\x00`;
    };

    // <br> (process at the start to ensure it is protected even inside other tags)
    t = t.replace(/<br\s*\/?>/gi, () => protect('\\\\'));

    // <code>
    t = t.replace(/<code>([\s\S]*?)<\/code>/g, (_, c) =>
        protect(`\\texttt{${escapeLatex(c)}}`));
    // <strong> / <b>
    t = t.replace(/<strong>([\s\S]*?)<\/strong>/g, (_, x) => protect(`\\textbf{${x}}`));
    t = t.replace(/<b>([\s\S]*?)<\/b>/g, (_, x) => protect(`\\textbf{${x}}`));
    // <em> / <i>
    t = t.replace(/<em>([\s\S]*?)<\/em>/g, (_, x) => protect(`\\textit{${x}}`));
    t = t.replace(/<i>([\s\S]*?)<\/i>/g, (_, x) => protect(`\\textit{${x}}`));
    // <u>
    t = t.replace(/<u>([\s\S]*?)<\/u>/g, (_, x) => protect(`\\underline{${x}}`));
    // <s> / <strike> / <del>
    t = t.replace(/<(?:s|strike|del)>([\s\S]*?)<\/(?:s|strike|del)>/g, (_, x) =>
        protect(`\\sout{${x}}`));
    // <a href="...">
    t = t.replace(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, url, label) =>
        protect(`\\href{${url}}{${label}}`));

    // Remove any remaining HTML tags
    t = t.replace(/<[^>]+>/g, '');

    // Escape LaTeX special chars in plain text
    t = escapeLatex(t);

    // Restore placeholders recursively to handle nested placeholders
    while (t.includes('\x00PH')) {
        t = t.replace(/\x00PH(\d+)\x00/g, (_, i) => placeholders[+i]);
    }

    t = t.trim();
    // Remove trailing \\ from the end of the inline block to prevent "! LaTeX Error: There's no line here to end."
    t = t.replace(/(?:\s*\\\\)+$/, '');

    return t;
}

// ============================================================
// Converte HTML do TipTap → LaTeX (blocos)
// ============================================================
function htmlToLatex(html, config = {}) {
    if (!html) return '';

    const output = [];
    const tocHeaders = config.toc_headers || { h1: true, h2: true, h3: false };
    const isVisible  = config.toc_visible !== false;

    // Tokenize block elements. TipTap outputs clean, non-nested block HTML.
    // We match block-level tags one by one.
    const blockRe = /<(h[1-4]|p|ul|ol|blockquote|pre|hr)([^>]*)>([\s\S]*?)<\/\1>|<hr\s*\/?>/gi;
    let lastIndex = 0;
    let match;

    const processListItems = (listHtml, ordered) => {
        const itemRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
        const items = [];
        let m;
        while ((m = itemRe.exec(listHtml)) !== null) {
            // Strip inner <p> wrapper that TipTap adds
            const inner = m[1].replace(/^<p[^>]*>([\s\S]*?)<\/p>$/i, '$1').trim();
            items.push(inlineHtmlToLatex(inner));
        }
        if (items.length === 0) return '';
        const env = ordered ? 'enumerate' : 'itemize';
        return `\\begin{${env}}\n${items.map(it => `  \\item ${it}`).join('\n')}\n\\end{${env}}`;
    };

    while ((match = blockRe.exec(html)) !== null) {
        lastIndex = blockRe.lastIndex;
        const tag     = (match[1] || 'hr').toLowerCase();
        const attrs   = match[2] || '';
        const inner   = match[3] || '';

        if (tag === 'hr') {
            output.push('\\medskip\n\\hrule\n\\medskip');
            continue;
        }

        // ── Headings ────────────────────────────────────────
        if (/^h[1-4]$/.test(tag)) {
            const level = parseInt(tag[1]);
            const rawTitle = inlineHtmlToLatex(inner).trim();
            if (!rawTitle || /^[\\s]+$/.test(rawTitle)) continue;

            const alignMatch = attrs.match(/text-align:\s*(center|right|left|justify)/);
            const align = alignMatch ? alignMatch[1] : null;
            
            const valign = config.valign || 'top';
            if (level === 1 && (valign === 'middle' || valign === 'bottom')) {
                // Ao alinhar verticalmente no meio/base da página, não usamos \chapter*
                // pois ele força quebra de página e margens fixas que quebram o layout do valign.
                // Em vez disso, desenhamos o título do capítulo inline de forma destacada.
                let styleCmd = '\\noindent';
                if (align === 'center') {
                    styleCmd = '\\centering';
                } else if (align === 'right') {
                    styleCmd = '\\raggedleft';
                }
                output.push(`{\\Huge\\bfseries${styleCmd} ${rawTitle}\\par}\\vspace{1.5em}`);
                output.push(`\\markboth{${rawTitle}}{}`);
                if (isVisible && tocHeaders.h1 !== false) {
                    output.push(`\\addcontentsline{toc}{chapter}{${rawTitle}}`);
                }
            } else {
                const cmd = ['chapter', 'section', 'subsection', 'subsubsection'][level - 1];
                let formattedTitle = rawTitle;
                if (align === 'center') {
                    formattedTitle = `\\centering ${rawTitle}`;
                } else if (align === 'right') {
                    formattedTitle = `\\raggedleft ${rawTitle}`;
                }
                output.push(`\\${cmd}*{${formattedTitle}}`);
                if (level === 1) output.push(`\\markboth{${rawTitle}}{}`);
                else if (level === 2) output.push(`\\markright{${rawTitle}}`);
                if (isVisible) {
                    const capture = (level === 1 && tocHeaders.h1 !== false) ||
                                    (level === 2 && tocHeaders.h2) ||
                                    (level === 3 && tocHeaders.h3);
                    if (capture) {
                        const tocLevel = ['chapter','section','subsection','subsubsection'][level-1];
                        output.push(`\\addcontentsline{toc}{${tocLevel}}{${rawTitle}}`);
                    }
                }
            }
            continue;
        }

        // ── Paragraph ────────────────────────────────────────
        if (tag === 'p') {
            const alignMatch = attrs.match(/text-align:\s*(center|right|left|justify)/);
            const align = alignMatch ? alignMatch[1] : null;
            const text = inlineHtmlToLatex(inner);

            // Se o parágrafo estiver vazio ou contiver apenas uma quebra de linha, 
            // insere um espaçamento vertical manual no PDF (equivalente a pular uma linha)
            if (!text.trim() || text.trim() === '\\\\') {
                output.push('\\vspace{\\baselineskip}');
                continue;
            }

            if (align === 'center') {
                output.push(`{\\centering ${text}\\par}`);
            } else if (align === 'right') {
                output.push(`{\\raggedleft ${text}\\par}`);
            } else if (align === 'justify') {
                output.push(text);
            } else {
                output.push(text);
            }
            continue;
        }

        // ── Lists ────────────────────────────────────────────
        if (tag === 'ul') { output.push(processListItems(inner, false)); continue; }
        if (tag === 'ol') { output.push(processListItems(inner, true));  continue; }

        // ── Blockquote ───────────────────────────────────────
        if (tag === 'blockquote') {
            const text = inlineHtmlToLatex(inner.replace(/<\/?p[^>]*>/g, ' ').trim());
            output.push(`\\begin{quote}\n${text}\n\\end{quote}`);
            continue;
        }

        // ── Code block ───────────────────────────────────────
        if (tag === 'pre') {
            const codeMatch = inner.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
            const code = codeMatch
                ? codeMatch[1].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
                : inner;
            output.push(`\\begin{lstlisting}\n${code}\n\\end{lstlisting}`);
            continue;
        }
    }

    return output.filter(l => l !== null && l !== undefined).join('\n\n');
}

// ============================================================
// Conversor de conteúdo único (HTML Nativo)
// ============================================================
function contentToLatex(content, config = {}) {
    return htmlToLatex(content, config);
}

// ============================================================
// Retorna configuração de pacotes/estilos para cada tema visual
// ============================================================
function getThemeConfig(theme) {
    const themes = {
        default: {
            fontPkg:      '',
            extraPkgs:    '',
            linespread:   null,
            sectionStyle: '',
        },
        editorial: {
            fontPkg:      '\\usepackage{palatino}',
            extraPkgs:    '\\usepackage[final,tracking=true,kerning=true,spacing=true]{microtype}',
            linespread:   '1.25',
            sectionStyle: [
                '\\usepackage{titlesec}',
                '\\titleformat{\\section}[hang]{\\large\\bfseries}{}{0pt}{}[\\vspace{2pt}\\hrule\\vspace{2pt}]',
                '\\titleformat{\\subsection}[hang]{\\normalsize\\itshape}{}{0pt}{}',
            ].join('\n'),
        },
        technical: {
            fontPkg:      '\\usepackage{bookman}',
            extraPkgs:    '\\usepackage[final]{microtype}',
            linespread:   '1.15',
            sectionStyle: [
                '\\usepackage{titlesec}',
                '\\titleformat{\\section}[block]{\\large\\bfseries\\sffamily}{}{0pt}{}[\\vspace{1pt}\\hrule]',
                '\\titleformat{\\subsection}[block]{\\normalsize\\bfseries\\sffamily}{}{0pt}{}',
            ].join('\n'),
        },
        minimal: {
            fontPkg:      '\\usepackage{charter}',
            extraPkgs:    '',
            linespread:   '1.35',
            sectionStyle: [
                '\\usepackage{titlesec}',
                '\\titleformat{\\section}[hang]{\\large\\scshape}{}{0pt}{}',
                '\\titleformat{\\subsection}[hang]{\\normalsize\\itshape}{}{0pt}{}',
            ].join('\n'),
        },
        corporate: {
            fontPkg:      '\\usepackage{helvet}\n\\renewcommand{\\familydefault}{\\sfdefault}',
            extraPkgs:    '\\usepackage[final]{microtype}',
            linespread:   '1.1',
            sectionStyle: [
                '\\usepackage{titlesec}',
                '\\titleformat{\\section}[block]{\\large\\bfseries\\sffamily}{}{0pt}{}',
                '\\titleformat{\\subsection}[block]{\\normalsize\\bfseries\\sffamily}{}{0pt}{}',
            ].join('\n'),
        },
    };
    return themes[theme] || themes.default;
}

// ============================================================
// Generate LaTeX preamble from global settings
// ============================================================
function generatePreamble(globalSetup, metadata) {
    const {
        paper = 'a5',
        mirror = true,
        baseSize = '11pt',
        bleed = false,
        engine = 'pdflatex',
        theme = 'default',
        customWidth,
        customHeight,
        innerMargin = '25mm',
        outerMargin = '20mm',
        topMargin = '25mm',
        bottomMargin = '20mm',
        parindent     = '0pt',
        parskip       = '8pt',
        bodyLinespread = null,
        bodyJustify   = 'justified',
        hyphenation   = true,
        orphanWidow   = 'moderate',
    } = globalSetup;

    // Resolve tema visual
    const themeConfig = getThemeConfig(theme);

    const { title = 'Documento', author = 'Autor', date = '\\today' } = metadata || {};

    const paperSize = PAPER_SIZES.find(p => p.value === paper) || PAPER_SIZES[1];
    const width = paper === 'custom' ? (customWidth || '148mm') : paperSize.width;
    const height = paper === 'custom' ? (customHeight || '210mm') : paperSize.height;

    const docClassOpts = [baseSize];
    if (mirror) docClassOpts.push('twoside');

    // ── Geometry options (sem linhas em branco no meio) ──────
    const geoOpts = [
        `papersize={${width},${height}}`,
        `inner=${innerMargin}`,
        `outer=${outerMargin}`,
        `top=${topMargin}`,
        `bottom=${bottomMargin}`,
        `twoside=${mirror ? 'true' : 'false'}`,
    ];
    if (bleed) {
        geoOpts.push(`layoutsize={${width},${height}}`);
        geoOpts.push('layouthoffset=3mm');
        geoOpts.push('layoutvoffset=3mm');
    }
    geoOpts.push('headheight=14pt');

    // ── Font package ─────────────────────────────────────────
    // A fonte é definida exclusivamente pelo tema visual
    let fontPkg = '';
    if (engine === 'lualatex') {
        fontPkg = '\\usepackage{fontspec}\n';
        if (themeConfig.fontPkg) fontPkg += themeConfig.fontPkg + '\n';
    } else {
        if (themeConfig.fontPkg) {
            fontPkg = themeConfig.fontPkg + '\n';
        }
    }

    // ── Header/footer style ──────────────────────────────────
    const getHeaderText = (styleOption, customText) => {
        if (styleOption === 'none') return '';
        if (styleOption === 'title') return escapeLatexTitle(title);
        if (styleOption === 'author') return escapeLatexTitle(author);
        if (styleOption === 'custom') return escapeLatexTitle(customText || '');
        if (styleOption === 'chapter') return '\\textit{\\leftmark}';
        return '\\textit{\\leftmark}';
    };

    const headerEvenText = getHeaderText(globalSetup.headerStyleEven || 'chapter', globalSetup.headerCustomEven);
    const headerOddText = getHeaderText(globalSetup.headerStyleOdd || 'chapter', globalSetup.headerCustomOdd);

    const fancyLines = mirror
        ? [
            '\\fancyfoot[LE,RO]{\\thepage}',
            `\\fancyhead[RE]{${headerEvenText}}`,
            `\\fancyhead[LO]{${headerOddText}}`
        ]
        : [
            '\\fancyfoot[C]{\\thepage}',
            `\\fancyhead[L]{${headerEvenText}}`,
            `\\fancyhead[R]{}` // Ensure right side is empty if not mirror
        ];

    const preamble = [
        '% Generated by BlockTeX IDE',
        `\\documentclass[${docClassOpts.join(',')}]{book}`,
        '',
        '% ─── Geometry ───────────────────────────────────────',
        `\\usepackage[${geoOpts.join(',\n  ')}]{geometry}`,
        '',
        '% ─── Language & Encoding ────────────────────────────',
        '\\usepackage[utf8]{inputenc}',
        '\\usepackage[T1]{fontenc}',
        '\\usepackage[brazilian]{babel}',
        '\\usepackage{indentfirst} % Garante recuo no primeiro parágrafo de capítulos/seções',
        '',
        '% ─── Typography ─────────────────────────────────────',
        fontPkg.trim() || '% (fonte padrão LaTeX)',
        themeConfig.extraPkgs  ? themeConfig.extraPkgs : '',
        themeConfig.sectionStyle ? themeConfig.sectionStyle : '',
        '',
        '% ─── Mathematics ────────────────────────────────────',
        '\\usepackage{amsmath}',
        '\\usepackage{amssymb}',
        '',
        '% ─── Graphics & Tables ──────────────────────────────',
        '\\usepackage{graphicx}',
        '\\usepackage{wrapfig}',
        '\\usepackage{float}',
        '\\usepackage{tikz}',
        '\\graphicspath{{./assets/}}',
        '',
        '% Cover-image macro (like CSS object-fit: cover)',
        '\\newsavebox{\\btxcoverbox}',
        '\\newcommand{\\btxcoverimg}[3]{% #1=path, #2=target width, #3=target height',
        '  \\sbox{\\btxcoverbox}{\\includegraphics[width=#2]{#1}}%',
        '  \\ifdim\\ht\\btxcoverbox<#3\\relax',
        '    \\includegraphics[height=#3]{#1}%',
        '  \\else',
        '    \\includegraphics[width=#2]{#1}%',
        '  \\fi',
        '}',
        '',
        '\\usepackage{booktabs}',
        '\\usepackage{array}',
        '\\usepackage{longtable}',
        '',
        '% ─── Colors ─────────────────────────────────────────',
        '\\usepackage{xcolor}',
        '\\definecolor{accent}{HTML}{6366F1}',
        '\\usepackage{eso-pic} % Full-bleed background images',
        '',
        '% ─── Code Listings ──────────────────────────────────',
        '\\usepackage{listings}',
        '\\lstset{',
        '  basicstyle=\\ttfamily\\small,',
        '  breaklines=true,',
        '  frame=single,',
        '  backgroundcolor=\\color{gray!10},',
        '  rulecolor=\\color{gray!30},',
        '  numbers=left,',
        '  numberstyle=\\tiny\\color{gray},',
        '  showstringspaces=false,',
        '  literate={á}{{\\\'a}}1 {ã}{{\\~a}}1 {â}{{\\^a}}1 {à}{{\\`a}}1',
        '           {é}{{\\\'e}}1 {ê}{{\\^e}}1',
        '           {í}{{\\\'i}}1',
        '           {ó}{{\\\'o}}1 {õ}{{\\~o}}1 {ô}{{\\^o}}1',
        '           {ú}{{\\\'u}}1 {ç}{{\\c{c}}}1',
        '           {Á}{{\\\'A}}1 {Ã}{{\\~A}}1 {Â}{{\\^A}}1 {À}{{\\`A}}1',
        '           {É}{{\\\'E}}1 {Ê}{{\\^E}}1',
        '           {Í}{{\\\'I}}1',
        '           {Ó}{{\\\'O}}1 {Õ}{{\\~O}}1 {Ô}{{\\^O}}1',
        '           {Ú}{{\\\'U}}1 {Ç}{{\\c{C}}}1,',
        '}',
        '',
        '% ─── Headers & Footers ──────────────────────────────',
        '\\usepackage{fancyhdr}',
        '\\pagestyle{fancy}',
        '\\fancyhf{}',
        ...fancyLines,
        '\\renewcommand{\\headrulewidth}{0pt}',
        '\\fancypagestyle{plain}{',
        '  \\fancyhf{}',
        mirror ? '  \\fancyfoot[LE,RO]{\\thepage}' : '  \\fancyfoot[C]{\\thepage}',
        '  \\renewcommand{\\headrulewidth}{0pt}',
        '}',
        '',
        '% ─── Hyperlinks & URLs ───────────────────────────────',
        '\\usepackage{url}',
        '\\usepackage[',
        '  colorlinks=true,',
        '  linkcolor=accent,',
        '  urlcolor=accent,',
        '  citecolor=accent,',
        `  pdftitle={${escapeLatexTitle(title)}},`,
        `  pdfauthor={${escapeLatexTitle(author)}},`,
        ']{hyperref}',
        '',
        '% ─── TOC & Sections ─────────────────────────────────',
        '\\usepackage{tocloft}',
        '% Renomeia Sumário para Índice',
        '\\renewcommand{\\contentsname}{Índice}',
        '% Suprime numeração: capítulos e seções ficam sem "1.", "2." etc.',
        '\\setcounter{secnumdepth}{-2}',
        '',
        '% ─── Misc ───────────────────────────────────────────',
        '\\usepackage{emptypage} % Remove cabeçalhos de páginas em branco vazias',
        '\\usepackage[normalem]{ulem} % \\sout for strikethrough (normalem keeps \\emph intact)',
        '',
        ...(() => {
            // ── btxbody: environment aplicado SOMENTE em blocos CHAPTER e CONTENT ──
            const penaltyMap = { light: 500, moderate: 1000, strict: 10000 };
            const penalty = penaltyMap[orphanWidow] || 1000;
            const linespread = bodyLinespread || themeConfig.linespread;
            const justifyCmd = {
                raggedright: '  \\raggedright%',
                raggedleft:  '  \\raggedleft%',
                centering:   '  \\centering%',
            }[bodyJustify] || '';
            return [
                '% ─── Body content environment (CHAPTER + CONTENT only) ──',
                '\\newenvironment{btxbody}{%',
                `  \\setlength{\\parindent}{${parindent}}%`,
                `  \\setlength{\\parskip}{${parskip}}%`,
                linespread ? `  \\linespread{${linespread}}\\selectfont%` : '',
                justifyCmd,
                !hyphenation ? '  \\hyphenpenalty=10000\\exhyphenpenalty=10000%' : '',
                `  \\widowpenalty=${penalty}%`,
                `  \\clubpenalty=${penalty}%`,
                '}{}',
                '',
            ].filter(l => l !== '');
        })(),
        '% ─── Title metadata (usada pelo bloco CAPA e hyperref) ──',
        `\\title{${escapeLatexTitle(title)}}`,
        `\\author{${escapeLatexTitle(author)}}`,
        `\\date{${date}}`,
        '',
        '\\begin{document}',
        '',
    ].filter(line => line !== null && line !== undefined).join('\n');

    return preamble;
}



// ============================================================
// Generate LaTeX for a single block
// ============================================================
function blockToLatex(block, mirror = false, isFirst = false) {
    const { type, content, config = {}, style_variables = {} } = block;
    let { page_break, toc_visible = true, valign = 'top' } = config;

    let tex = '';
    const breakCmd = '\\clearpage';

    // Para blocos estruturais principais, se a quebra de página for 'none' ou indefinida,
    // nós definimos como 'before' para garantir que o texto do bloco sempre comece em uma página nova
    // e não invada o conteúdo do bloco anterior.
    if (type === BLOCK_TYPES.CHAPTER || 
        type === BLOCK_TYPES.CONTENT || 
        type === BLOCK_TYPES.TOC || 
        type === BLOCK_TYPES.TESTIMONIAL) {
        if (!page_break || page_break === 'none') {
            page_break = 'before';
        }
    }

    // Se o alinhamento vertical for 'middle' ou 'bottom', o preenchimento vertical (\fill)
    // necessita que o bloco esteja em uma página própria para funcionar corretamente.
    if (valign === 'middle' || valign === 'bottom') {
        if (!page_break || page_break === 'none') {
            page_break = 'before';
        }
    }

    // Se for o primeiro bloco do documento, não precisamos de quebra antes dele.
    if (isFirst) {
        page_break = 'none';
    }

    // Executa a quebra de página selecionada:
    // - 'isolated': Começa obrigatoriamente na próxima página ímpar (\cleardoublepage).
    // - 'before': Começa na próxima página normal (\clearpage), sem criar páginas em branco desnecessárias.
    if (page_break === 'isolated') {
        tex += '\\cleardoublepage\n\n';
    } else if (page_break === 'before') {
        tex += '\\clearpage\n\n';
    }

    // Se o alinhamento vertical for 'middle' ou 'bottom', inserimos o preenchimento vertical no topo da página
    if (valign === 'middle' || valign === 'bottom') {
        tex += `\\vspace*{\\fill}\n\n`;
    }

    switch (type) {
        case BLOCK_TYPES.COVER:
            tex += `\\thispagestyle{empty}\n\\begingroup\n\\LARGE\n${contentToLatex(content, config)}\n\\endgroup\n${breakCmd}\n`;
            break;

        // CHAPTER e CONTENT (legado) geram o mesmo LaTeX
        case BLOCK_TYPES.CHAPTER:
        case BLOCK_TYPES.CONTENT: // migração: projetos antigos podem ter blocos 'content'
            if (!toc_visible) tex += `\\begingroup\\renewcommand{\\addcontentsline}[3]{}\n`;
            tex += `\\begin{btxbody}\n${contentToLatex(content, config)}\n\\end{btxbody}\n`;
            if (!toc_visible) tex += `\\endgroup\n`;
            break;

        case BLOCK_TYPES.QUOTE: {
            const rawColor = (style_variables.color || '#6366f1').replace('#', '');
            // Garante 6 dígitos hex válidos
            const hexColor = /^[0-9A-Fa-f]{6}$/.test(rawColor) ? rawColor : '6366F1';
            tex += `{\\color[HTML]{${hexColor}}\n\\begin{quotation}\n${contentToLatex(content, config)}\n\\end{quotation}}\n`;
            break;
        }

        case BLOCK_TYPES.CODE:
            tex += contentToLatex(content, config) + '\n';
            break;

        case BLOCK_TYPES.TOC: {
            const tocLinks = style_variables.tocLinks === true;
            const tocFill  = style_variables.tocFill || 'empty'; // 'empty' | 'dots' | 'line'

            // Fill character between entry text and page number
            let fillCmd = '';
            if (tocFill === 'dots') {
                // Closely-spaced dots: sep=1 gives tight dots (default \cftdotsep≈4.5 is too sparse)
                fillCmd = [
                    '\\renewcommand{\\cftchapleader}{\\cftdotfill{1}}',
                    '\\renewcommand{\\cftsecleader}{\\cftdotfill{1}}',
                    '\\renewcommand{\\cftsubsecleader}{\\cftdotfill{1}}',
                ].join('\n');
            } else if (tocFill === 'line') {
                // True continuous underline using \leaders\hrule (not dots)
                fillCmd = [
                    '\\renewcommand{\\cftchapleader}{\\enspace\\leaders\\hbox{\\rule[0.4ex]{1pt}{0.4pt}}\\hfill\\enspace}',
                    '\\renewcommand{\\cftsecleader}{\\enspace\\leaders\\hbox{\\rule[0.4ex]{1pt}{0.4pt}}\\hfill\\enspace}',
                    '\\renewcommand{\\cftsubsecleader}{\\enspace\\leaders\\hbox{\\rule[0.4ex]{1pt}{0.4pt}}\\hfill\\enspace}',
                ].join('\n');
            } else {
                // Empty — no fill between text and page number
                fillCmd = [
                    '\\renewcommand{\\cftchapleader}{}',
                    '\\renewcommand{\\cftsecleader}{}',
                    '\\renewcommand{\\cftsubsecleader}{}',
                ].join('\n');
            }

            // Links control
            const linksCmd = tocLinks
                ? '' // hyperref already enables links by default
                : '{\\hypersetup{hidelinks}\n'; // suppress link colours inside TOC
            const linksEnd = tocLinks ? '' : '}';

            tex += `${linksCmd}${fillCmd}\n\\tableofcontents\n${linksEnd}${breakCmd}\n`;
            break;
        }

        case BLOCK_TYPES.SEPARATOR:
            if (style_variables.pageBreak) {
                tex += `\\clearpage\n`;
            } else {
                tex += `\\vspace{12pt}\n\\hrule\n\\vspace{12pt}\n`;
            }
            break;

        case BLOCK_TYPES.IMAGE: {
            // ── Single image: inline in text, OR exclusive page ──────────────
            const caption    = style_variables.caption    || '';
            const title      = style_variables.title      || '';
            const widthFrac  = parseFloat(style_variables.width) || 0.8;
            const layout     = style_variables.layout     || 'center'; // center | full | left | right
            const floatPos   = style_variables.floatPos   || 'h';
            const fillMode   = style_variables.fillMode   || 'fit';    // fit | stretch | bleed
            const keepRatio  = style_variables.keepRatio  !== false;
            const cropAnchor = style_variables.cropAnchor || 'center'; // top | center | bottom
            const pageStyle  = style_variables.pageStyle  || 'empty';
            const exclusive  = style_variables.exclusivePage === true;

            // Resolve image source
            let imgRef = null;
            if (style_variables.imageBase64) {
                const fn = (style_variables.filename || `img_${block.id}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
                imgRef = `assets/${fn}`;
            } else {
                const imgMatch = content.match(/<!--\s*image:\s*(.+?)\s*-->/);
                if (imgMatch) imgRef = `assets/${imgMatch[1].replace(/[^a-zA-Z0-9/_.-]/g, '_')}`;
            }

            if (!imgRef && !exclusive) {
                tex += contentToLatex(content, config) + '\n';
                break;
            }

            const breakCmd  = mirror ? '\\cleardoublepage' : '\\clearpage';
            const anchorMap = { top: 'north', center: 'center', bottom: 'south' };
            const tikzAnc   = anchorMap[cropAnchor] || 'center';
            const yPosBleed = cropAnchor === 'top'    ? '0.5\\paperwidth,\\paperheight'
                            : cropAnchor === 'bottom' ? '0.5\\paperwidth,0'
                            : '0.5\\paperwidth,0.5\\paperheight';

            if (exclusive) {
                // ── Exclusive page mode ──────────────────────────────────────
                tex += `${breakCmd}\n`;
                tex += `\\thispagestyle{${pageStyle}}\n`;

                if (fillMode === 'bleed' && imgRef) {
                    if (keepRatio) {
                        tex += `\\AddToShipoutPictureBG*{%\n`;
                        tex += `  \\AtPageLowerLeft{%\n`;
                        tex += `    \\begin{tikzpicture}\n`;
                        tex += `      \\useasboundingbox (0,0) rectangle (\\paperwidth,\\paperheight);\n`;
                        tex += `      \\clip (0,0) rectangle (\\paperwidth,\\paperheight);\n`;
                        tex += `      \\node[inner sep=0pt, anchor=${tikzAnc}] at (${yPosBleed}) {%\n`;
                        tex += `        \\btxcoverimg{${imgRef}}{\\paperwidth}{\\paperheight}%\n`;
                        tex += `      };\n`;
                        tex += `    \\end{tikzpicture}%\n`;
                        tex += `  }%\n`;
                        tex += `}\n`;
                    } else {
                        tex += `\\AddToShipoutPictureBG*{%\n`;
                        tex += `  \\AtPageLowerLeft{\\includegraphics[width=\\paperwidth,height=\\paperheight]{${imgRef}}}%\n`;
                        tex += `}\n`;
                    }
                    if (title || caption) {
                        tex += `\\vspace*{\\fill}\n`;
                        if (title)   tex += `{\\centering\\color{white}\\large\\bfseries ${escapeLatex(title)}\\par\\vspace{0.5em}}\n`;
                        if (caption) tex += `{\\centering\\color{white}\\small ${escapeLatex(caption)}\\par}\n`;
                        tex += `\\vspace*{\\fill}\n`;
                    } else {
                        tex += `\\null\n`;
                    }
                    tex += `\\newpage\n`;

                } else if (imgRef) {
                    tex += `\\vspace*{\\fill}\n`;
                    if (title) tex += `{\\centering\\large\\bfseries ${escapeLatex(title)}\\par\\vspace{1em}}\n`;
                    if (fillMode === 'stretch' && keepRatio) {
                        const yPosTxt = cropAnchor === 'top' ? '0.85\\textheight' : cropAnchor === 'bottom' ? '0' : '0.425\\textheight';
                        tex += `\\noindent\\begin{tikzpicture}\n`;
                        tex += `  \\useasboundingbox (0,0) rectangle (\\textwidth,0.85\\textheight);\n`;
                        tex += `  \\clip (0,0) rectangle (\\textwidth,0.85\\textheight);\n`;
                        tex += `  \\node[inner sep=0pt, anchor=${tikzAnc}] at (0.5\\textwidth,${yPosTxt}) {%\n`;
                        tex += `    \\btxcoverimg{${imgRef}}{\\textwidth}{0.85\\textheight}%\n`;
                        tex += `  };\n`;
                        tex += `\\end{tikzpicture}\n`;
                    } else if (fillMode === 'stretch') {
                        tex += `\\begin{figure}[H]\n  \\centering\n`;
                        tex += `  \\includegraphics[width=\\textwidth,height=0.85\\textheight]{${imgRef}}\n`;
                        if (caption) tex += `  \\caption*{${escapeLatex(caption)}}\n`;
                        tex += `\\end{figure}\n`;
                    } else {
                        tex += `\\begin{figure}[H]\n  \\centering\n`;
                        tex += `  \\includegraphics[width=\\textwidth,height=0.85\\textheight,keepaspectratio]{${imgRef}}\n`;
                        if (caption) tex += `  \\caption*{${escapeLatex(caption)}}\n`;
                        tex += `\\end{figure}\n`;
                    }
                    tex += `\\vspace*{\\fill}\n`;
                } else {
                    tex += `% [Bloco Imagem sem imagem configurada]\n`;
                }

            } else {
                // ── Inline mode (flows with text) ────────────────────────────
                const captionTex = caption ? `  \\caption{${escapeLatex(caption)}}\n` : '';
                if (layout === 'full') {
                    tex += `\\begin{figure}[${floatPos}]\n  \\centering\n  \\includegraphics[width=\\textwidth]{${imgRef}}\n${captionTex}\\end{figure}\n`;
                } else if (layout === 'left' || layout === 'right') {
                    const wrapSide  = layout === 'left' ? 'l' : 'r';
                    const wrapWidth = `${widthFrac}\\textwidth`;
                    tex += `\\begin{wrapfigure}{${wrapSide}}{${wrapWidth}}\n`;
                    tex += `  \\centering\n`;
                    tex += `  \\includegraphics[width=\\linewidth]{${imgRef}}\n`;
                    if (caption) tex += `  \\caption{${escapeLatex(caption)}}\n`;
                    tex += `\\end{wrapfigure}\n`;
                    if (content && !content.match(/^<!--/)) tex += contentToLatex(content, config) + '\n';
                } else {
                    tex += `\\begin{figure}[${floatPos}]\n  \\centering\n  \\includegraphics[width=${widthFrac}\\textwidth]{${imgRef}}\n${captionTex}\\end{figure}\n`;
                }
            }
            break;
        }

        case BLOCK_TYPES.IMAGE_GRID: {
            // ── Multiple images: stacked | side-by-side | grid-4 ────────────
            const gridLayout   = style_variables.gridLayout  || 'side-by-side'; // stacked | side-by-side | grid-4
            const exclusive_g  = style_variables.exclusivePage === true;
            const captionG     = style_variables.caption     || '';
            const spacingG     = style_variables.spacing      || '1em';
            const floatPosG    = exclusive_g ? 'H' : (style_variables.floatPos || 'h');

            // Build asset refs for up to 4 images
            const gRefs = [1, 2, 3, 4].map(i => {
                const b64  = style_variables[`image${i}Base64`];
                const fn   = style_variables[`filename${i}`];
                if (!b64) return null;
                return `assets/${(fn || `img_grid_${i}_${block.id}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            });
            const gCaps = [1, 2, 3, 4].map(i => style_variables[`caption${i}`] || '');
            const wSlider = parseFloat(style_variables.imageWidth) || (gridLayout === 'grid-4' ? 0.47 : 0.48);

            const hasAny = gRefs.some(r => r !== null);
            if (!hasAny) { tex += `% [Bloco Grade de Imagens sem imagens configuradas]\n`; break; }

            if (exclusive_g) tex += `\\clearpage\n`;

            if (gridLayout === 'stacked') {
                // 2 images vertically stacked
                const fullWidth = parseFloat(style_variables.imageWidth) || 0.85;
                tex += `\\begin{figure}[${floatPosG}]\n  \\centering\n`;
                if (gRefs[0]) {
                    tex += `  \\includegraphics[width=${fullWidth}\\textwidth]{${gRefs[0]}}\n`;
                    if (gCaps[0]) tex += `  \\caption*{${escapeLatex(gCaps[0])}}\n`;
                }
                if (gRefs[0] && gRefs[1]) tex += `  \\vspace{${spacingG}}\\\\\n`;
                if (gRefs[1]) {
                    tex += `  \\includegraphics[width=${fullWidth}\\textwidth]{${gRefs[1]}}\n`;
                    if (gCaps[1]) tex += `  \\caption*{${escapeLatex(gCaps[1])}}\n`;
                }
                if (captionG) tex += `  \\caption*{${escapeLatex(captionG)}}\n`;
                tex += `\\end{figure}\n`;

            } else if (gridLayout === 'side-by-side') {
                // 2 images side-by-side via minipage
                tex += `\\begin{figure}[${floatPosG}]\n  \\centering\n`;
                if (gRefs[0]) {
                    tex += `  \\begin{minipage}[t]{${wSlider}\\textwidth}\n`;
                    tex += `    \\centering\n`;
                    tex += `    \\includegraphics[width=\\linewidth]{${gRefs[0]}}\n`;
                    if (gCaps[0]) tex += `    \\caption*{${escapeLatex(gCaps[0])}}\n`;
                    tex += `  \\end{minipage}`;
                }
                if (gRefs[0] && gRefs[1]) tex += `\n  \\hfill\n`;
                if (gRefs[1]) {
                    tex += `  \\begin{minipage}[t]{${wSlider}\\textwidth}\n`;
                    tex += `    \\centering\n`;
                    tex += `    \\includegraphics[width=\\linewidth]{${gRefs[1]}}\n`;
                    if (gCaps[1]) tex += `    \\caption*{${escapeLatex(gCaps[1])}}\n`;
                    tex += `  \\end{minipage}\n`;
                }
                if (captionG) tex += `  \\caption*{${escapeLatex(captionG)}}\n`;
                tex += `\\end{figure}\n`;

            } else if (gridLayout === 'grid-4') {
                // 2×2 grid using 4 minipages
                tex += `\\begin{figure}[${floatPosG}]\n  \\centering\n`;
                const pairs = [[0,1],[2,3]];
                for (const [a, b] of pairs) {
                    if (!gRefs[a] && !gRefs[b]) continue;
                    if (gRefs[a]) {
                        tex += `  \\begin{minipage}[t]{${wSlider}\\textwidth}\n`;
                        tex += `    \\centering\n`;
                        tex += `    \\includegraphics[width=\\linewidth]{${gRefs[a]}}\n`;
                        if (gCaps[a]) tex += `    \\caption*{${escapeLatex(gCaps[a])}}\n`;
                        tex += `  \\end{minipage}`;
                    }
                    if (gRefs[a] && gRefs[b]) tex += `\n  \\hfill\n`;
                    if (gRefs[b]) {
                        tex += `  \\begin{minipage}[t]{${wSlider}\\textwidth}\n`;
                        tex += `    \\centering\n`;
                        tex += `    \\includegraphics[width=\\linewidth]{${gRefs[b]}}\n`;
                        if (gCaps[b]) tex += `    \\caption*{${escapeLatex(gCaps[b])}}\n`;
                        tex += `  \\end{minipage}\n`;
                    }
                    tex += `  \\vspace{${spacingG}}\\\\\n`;
                }
                if (captionG) tex += `  \\caption*{${escapeLatex(captionG)}}\n`;
                tex += `\\end{figure}\n`;
            }

            if (exclusive_g) tex += `\\newpage\n`;
            break;
        }

                case BLOCK_TYPES.TESTIMONIAL: {
            const {
                personName = '',
                quote = '',
                intro = '',
                imageBase64,
                frameWidth = '0.35\\textwidth',
                imageZoom = '\\textwidth'
            } = style_variables;

            // Tratamento das larguras (caso sejam números raw, converte para \textwidth, senão usa o texto do user direct)
            const leftWidthStr = frameWidth.includes('c') || frameWidth.includes('m') || frameWidth.includes('in') || frameWidth.includes('ex') || frameWidth.includes('tt') || frameWidth.includes('\\')
                ? frameWidth : `${frameWidth}\\textwidth`;

            // Assume the right side takes up the rest
            tex += `\\vspace{1em}\n\\noindent\n`;

            if (imageBase64) {
                tex += `\\begin{minipage}[t]{${leftWidthStr}}\n`;
                tex += `\\vspace{0pt}\n`;
                tex += `\\includegraphics[width=${imageZoom}]{assets/depo_img_${block.id}.jpg}\n`;
                tex += `\\end{minipage}%\n`;
                tex += `\\hfill\n`;
                tex += `\\begin{minipage}[t]{\\dimexpr\\textwidth-${leftWidthStr}-0.05\\textwidth\\relax}\n`;
                tex += `\\vspace{0pt}\n`;
            } else {
                tex += `\\begin{minipage}[t]{\\textwidth}\n`;
            }

            if (personName) tex += `\\MakeUppercase{${escapeLatex(personName)}}\\\\[0.5em]\n`;
            if (quote) tex += `\\textbf{\\Large ${escapeLatex(quote)}}\\\\[0.5em]\n`;
            if (intro) tex += `\\textit{${escapeLatex(intro)}}\n`;

            tex += `\\end{minipage}\n\n`;
            tex += `\\vspace{1.5em}\n`;
            tex += contentToLatex(content, config) + '\n';
            break;
        }

        default:
            tex += contentToLatex(content, config) + '\n';
    }

    if (valign === 'middle' || valign === 'bottom') {
        // Remove quebra de página final temporariamente se o bloco já a gera de forma nativa
        let hasEndPageBreak = false;
        let endBreakCmd = '';

        const trimmedTex = tex.trim();
        if (trimmedTex.endsWith('\\clearpage')) {
            hasEndPageBreak = true;
            endBreakCmd = '\\clearpage\n';
            tex = tex.substring(0, tex.lastIndexOf('\\clearpage'));
        } else if (trimmedTex.endsWith('\\cleardoublepage')) {
            hasEndPageBreak = true;
            endBreakCmd = '\\cleardoublepage\n';
            tex = tex.substring(0, tex.lastIndexOf('\\cleardoublepage'));
        } else if (trimmedTex.endsWith('\\newpage')) {
            hasEndPageBreak = true;
            endBreakCmd = '\\newpage\n';
            tex = tex.substring(0, tex.lastIndexOf('\\newpage'));
        }

        // Se for middle, adicionamos o preenchimento vertical abaixo do conteúdo do bloco
        if (valign === 'middle') {
            tex += `\n\\vspace*{\\fill}\n`;
        }

        // Restaura a quebra de página original ou insere uma nova quebra de página (pois alinhamento vertical isola o bloco na página)
        if (hasEndPageBreak) {
            tex += endBreakCmd;
        } else {
            tex += `\n${breakCmd}\n`;
        }
    }

    tex += '\n';
    return tex;
}

// ============================================================
// Helper to collapse consecutive page breaks (e.g. \clearpage \clearpage)
// ============================================================
function collapsePageBreaks(tex) {
    // Captura sequências de dois ou mais comandos de quebra separados apenas por espaços ou newlines
    const regex = /\\(clearpage|cleardoublepage|newpage)(?:\s*\\(clearpage|cleardoublepage|newpage))+/g;

    return tex.replace(regex, (match) => {
        const commands = match.match(/\\(clearpage|cleardoublepage|newpage)/g);
        if (!commands) return match;

        let hasDouble = false;
        let hasClear = false;

        for (const cmd of commands) {
            if (cmd === '\\cleardoublepage') hasDouble = true;
            else if (cmd === '\\clearpage') hasClear = true;
        }

        if (hasDouble) return '\n\\cleardoublepage\n';
        if (hasClear) return '\n\\clearpage\n';
        return '\n\\newpage\n';
    });
}

// ============================================================
// Generate full .tex document from project data
// ============================================================
export function generateTex(projectData) {
    const { metadata, global_setup, blocks } = projectData;

    let tex = generatePreamble(global_setup, metadata);

    for (let i = 0; i < blocks.length; i++) {
        tex += blockToLatex(blocks[i], global_setup.mirror, i === 0);
    }

    tex += '\n\\end{document}\n';

    // Remove quebras de página consecutivas e redundantes
    tex = collapsePageBreaks(tex);

    return tex;
}

// ============================================================
// Generate HTML preview (approximation)
// ============================================================
export function generateHtmlPreview(blocks) {
    let html = '';

    for (const block of blocks) {
        const { type, content } = block;
        if (!content) continue;

        let blockHtml = '';

        switch (type) {
            case BLOCK_TYPES.TOC:
                blockHtml = '<div style="padding:16px;background:#f8f8fc;border:1px solid #e0e0f0;border-radius:8px"><strong>Índice (gerado pelo LaTeX)</strong></div>';
                break;
            case BLOCK_TYPES.SEPARATOR:
                blockHtml = '<hr style="border:none;border-top:1px solid #ccc;margin:24px 0">';
                break;
            default:
                blockHtml = content; // Já é HTML nativo puro!
        }

        html += blockHtml;
    }

    return html;
}

export { escapeLatex };
