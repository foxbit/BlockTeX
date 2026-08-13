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
        .replace(/>/g, '\\textgreater{}')
        .replace(/\$/g, '\\$')
        .replace(/_/g, '\\_')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}');
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
        .replace(/>/g, '\\textgreater{}')
        .replace(/\$/g, '\\$')
        .replace(/_/g, '\\_')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}');
}

// ============================================================
// Converte tabela Markdown GFM para LaTeX
// ============================================================
function tableToLatex(tableText) {
    const lines = tableText.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return tableText;

    // Parseia as células da linha (remove pipes externos)
    const parseCells = (line) =>
        line.replace(/^\|/, '').replace(/\|$/, '')
            .split('|')
            .map(c => c.trim());

    const headers = parseCells(lines[0]);
    const sep = lines[1]; // linha com ---
    const rows = lines.slice(2).map(parseCells);

    // Detecta alinhamento
    const aligns = parseCells(sep).map(c => {
        if (c.startsWith(':') && c.endsWith(':')) return 'c';
        if (c.endsWith(':')) return 'r';
        return 'l';
    });

    const colSpec = aligns.map(a => {
        if (a === 'c') return '>{\\centering\\arraybackslash}X';
        if (a === 'r') return '>{\\raggedleft\\arraybackslash}X';
        return '>{\\raggedright\\arraybackslash}X';
    }).join('|');
    const headerRow = headers.map(h => inlineToLatex(h)).join(' & ');
    const bodyRows = rows.map(r =>
        r.map((c, i) => inlineToLatex(c || '')).join(' & ')
    ).join(' \\\\\ \n');

    return [
        `\\begin{table}[H]`,
        `  \\centering`,
        `  \\begin{tabularx}{\\textwidth}{|${colSpec}|}`,
        `    \\hline`,
        `    ${headerRow} \\\\`,
        `    \\hline`,
        bodyRows ? `    ${bodyRows} \\\\` : '',
        `    \\hline`,
        `  \\end{tabularx}`,
        `\\end{table}`,
    ].filter(Boolean).join('\n');
}

// ============================================================
// Converte inline markdown (bold, italic, code, math, links)
// ============================================================
function inlineToLatex(text) {
    let t = stripEmojis(text);

    // Protege math inline $...$ antes de escapar
    const mathPlaceholders = [];
    t = t.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => {
        mathPlaceholders.push(`\\[${m}\\]`);
        return `\x00MATH${mathPlaceholders.length - 1}\x00`;
    });
    t = t.replace(/(?<!\\)\$([^\$\n]+?)\$(?!\$)/g, (_, m) => {
        mathPlaceholders.push(`$${m}$`);
        return `\x00MATH${mathPlaceholders.length - 1}\x00`;
    });

    // Protege código inline `...`
    const codePlaceholders = [];
    t = t.replace(/`([^`]+)`/g, (_, c) => {
        codePlaceholders.push(`\\texttt{${c.replace(/[{}]/g, '\\$&')}}`);
        return `\x00CODE${codePlaceholders.length - 1}\x00`;
    });

    // Protege URLs em links [texto](url) para evitar escapar underlines nela
    const urlPlaceholders = [];
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
        urlPlaceholders.push(url);
        return `[${label}](\x00URL${urlPlaceholders.length - 1}\x00)`;
    });

    // Underline: o TipTap serializa <u> como HTML inline (Markdown não tem underline).
    // Converte para \underline{} do LaTeX antes de qualquer escape.
    t = t.replace(/<u>(.+?)<\/u>/g, (_, x) => `\\underline{${x}}`);

    // [LEGACY] Protege entidades HTML remanescentes de projetos antigos.
    // Novos conteúdos já são sanitizados na saída do TipTap (sanitizeMarkdown),
    // mas projetos .btx salvos anteriormente podem conter &gt; etc.
    const entityPlaceholders = [];
    t = t.replace(/&(amp|lt|gt|quot|apos);/g, (match) => {
        const map = {
            '&amp;':  '\\&',
            '&lt;':   '\\textless{}',
            '&gt;':   '\\textgreater{}',
            '&quot;': '"',
            '&apos;': "'",
        };
        entityPlaceholders.push(map[match] || match);
        return `\x00ENTITY${entityPlaceholders.length - 1}\x00`;
    });

    // Escapa caracteres LaTeX no texto normal.
    // ATENÇÃO: '\' deve ser escapado PRIMEIRO, pois os escapes
    // seguintes introduzem '\' e não devem ser re-processados.
    t = t
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/&/g, '\\&')
        .replace(/%(?!\x00)/g, '\\%')
        .replace(/#/g, '\\#')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/\$/g, '\\$')
        .replace(/\{/g, '\\{')
        .replace(/\}/g, '\\}');

    // Bold + Italic combinado (***texto***)
    t = t.replace(/\*\*\*(.+?)\*\*\*/g, (_, x) => `\\textbf{\\textit{${x}}}`);
    // Bold (**texto** ou __texto__)
    t = t.replace(/\*\*(.+?)\*\*/gs, (_, x) => `\\textbf{${x}}`);
    t = t.replace(/__(.+?)__/gs, (_, x) => `\\textbf{${x}}`);
    // Italic (*texto* ou _texto_)
    t = t.replace(/\*(.+?)\*/gs, (_, x) => `\\textit{${x}}`);
    t = t.replace(/(?<![a-zA-Z0-9])_([^_\n]+?)_(?![a-zA-Z0-9])/g, (_, x) => `\\textit{${x}}`);

    // Escapa underlines restantes (que não foram consumidos como itálico/negrito)
    t = t.replace(/_/g, '\\_');

    // Converte links de volta e gera o comando \href
    t = t.replace(/\[([^\]]+)\]\(\x00URL(\d+)\x00\)/g, (_, label, urlId) => {
        const url = urlPlaceholders[+urlId];
        return `\\href{${url}}{${label}}`;
    });

    // Restaura placeholders
    t = t.replace(/\x00ENTITY(\d+)\x00/g, (_, i) => entityPlaceholders[+i]);
    t = t.replace(/\x00CODE(\d+)\x00/g, (_, i) => codePlaceholders[+i]);
    t = t.replace(/\x00MATH(\d+)\x00/g, (_, i) => mathPlaceholders[+i]);

    return t;
}

// ============================================================
// Converte listas (unordered e ordered) com suporte a sub-listas
// ============================================================
function listToLatex(lines, baseIndent = 0) {
    const items = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const indent = line.search(/\S/);
        if (indent < baseIndent) break;

        const orderedMatch = line.trim().match(/^(\d+)\. (.*)/);
        const unorderedMatch = line.trim().match(/^[-*+] (.*)/);

        if (!orderedMatch && !unorderedMatch) { i++; continue; }

        const content = orderedMatch ? orderedMatch[2] : unorderedMatch[1];
        const subLines = [];
        let j = i + 1;
        while (j < lines.length && lines[j].search(/\S/) > indent) {
            subLines.push(lines[j]);
            j++;
        }
        const sub = subLines.length ? '\n' + listToLatex(subLines, indent + 2) : '';
        items.push({ content, ordered: !!orderedMatch, sub });
        i = j;
    }

    if (items.length === 0) return '';
    const allOrdered = items.every(it => it.ordered);
    const env = allOrdered ? 'enumerate' : 'itemize';
    const body = items.map(it =>
        `  \\item ${inlineToLatex(it.content)}${it.sub}`
    ).join('\n');
    return `\\begin{${env}}\n${body}\n\\end{${env}}`;
}

// ============================================================
// Conversor Markdown → LaTeX completo
// ============================================================
function mdToLatex(md, config = {}) {
    if (!md) return '';
    // Remove as tags div das marcações virtuais (flags) para que não apareçam no PDF
    const cleanMd = md.replace(/<div[^>]*data-type="virtual-flag"[\s\S]*?>[\s\S]*?<\/div>/g, '');
    const lines = cleanMd.split('\n');
    const output = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // ── Bloco de código (fenced) ─────────────────────────
        if (line.startsWith('```')) {
            const lang = line.slice(3).trim() || 'text';
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            i++; // fecha ```
            // Map of safe natively supported languages by the listings package
            const langMap = { 'c++': 'C++', 'cpp': 'C++', 'python': 'Python', 'py': 'Python', 'java': 'Java', 'bash': 'bash', 'sh': 'bash', 'sql': 'SQL', 'html': 'HTML', 'xml': 'XML', 'c': 'C', 'php': 'PHP', 'ruby': 'Ruby' };
            const latexLang = langMap[lang.toLowerCase()];

            if (latexLang) {
                output.push(`\\begin{lstlisting}[language=${latexLang}]`);
            } else {
                output.push(`\\begin{lstlisting}`);
            }
            output.push(...codeLines);
            output.push(`\\end{lstlisting}`);
            continue;
        }

        // ── Tabela GFM ────────────────────────────────────────
        if (line.includes('|') && i + 1 < lines.length && lines[i + 1].match(/^[\s|:-]+$/)) {
            const tableLines = [line];
            i++;
            while (i < lines.length && lines[i].includes('|')) {
                tableLines.push(lines[i]);
                i++;
            }
            output.push(tableToLatex(tableLines.join('\n')));
            continue;
        }

        // ── Math bloco $$ ... $$ ──────────────────────────────
        if (line.trim().startsWith('$$')) {
            const mathLines = [line.trim().slice(2)];
            if (!line.trim().endsWith('$$') || line.trim() === '$$') {
                i++;
                while (i < lines.length && !lines[i].includes('$$')) {
                    mathLines.push(lines[i]);
                    i++;
                }
                if (i < lines.length) mathLines.push(lines[i].replace('$$', ''));
            } else {
                mathLines[0] = mathLines[0].replace(/\$\$$/, '');
            }
            i++;
            output.push(`\\[${mathLines.join('\n')}\\]`);
            continue;
        }

        // ── Heading # ─────────────────────────────────────────
        const hMatch = line.match(/^(#{1,4}) (.+)$/);
        if (hMatch) {
            const level = hMatch[1].length;
            const rawTitle = hMatch[2].replace(/\*\*(.+?)\*\*/g, '$1').trim();
            // Guard: pula headings com título vazio ou somente barras/espaços
            // (ex: '## \\' gerado por conversão incorreta de DOCX)
            if (!rawTitle || /^[\\\s]+$/.test(rawTitle)) {
                i++;
                continue;
            }
            const title = escapeLatexTitle(rawTitle);
            const cmd = ['chapter', 'section', 'subsection', 'subsubsection'][level - 1];
            output.push(`\\${cmd}*{${title}}`);

            // Atualiza os cabeçalhos (fancyhdr) para refletir este título e sobrescrever o nome 'Sumário'
            if (level === 1) {
                output.push(`\\markboth{${title}}{}`);
            } else if (level === 2) {
                output.push(`\\markright{${title}}`);
            }

            const tocHeaders = config.toc_headers || { h1: true, h2: true, h3: false };
            const isVisible = config.toc_visible !== false;

            // Adiciona ao TOC manualmente, respeitando as marcações de Checkbox
            if (isVisible) {
                const shouldCapture = (level === 1 && tocHeaders.h1 !== false) ||
                    (level === 2 && tocHeaders.h2) ||
                    (level === 3 && tocHeaders.h3);
                if (shouldCapture) {
                    const tocLevel = ['chapter', 'section', 'subsection', 'subsubsection'][level - 1];
                    output.push(`\\addcontentsline{toc}{${tocLevel}}{${title}}`);
                }
            }

            i++;
            continue;
        }

        // ── Blockquote ─────────────────────────────────────────
        // Suporta tanto '> ' literal quanto '&gt; ' (entidade HTML do editor)
        if (line.startsWith('> ') || line.startsWith('&gt; ')) {
            const prefix = line.startsWith('&gt; ') ? '&gt; ' : '> ';
            const prefixLen = prefix.length;
            const quoteLines = [];
            while (i < lines.length && (lines[i].startsWith('> ') || lines[i].startsWith('&gt; '))) {
                quoteLines.push(lines[i].slice(prefixLen));
                i++;
            }
            output.push(`\\begin{quote}`);
            output.push(quoteLines.map(inlineToLatex).join(' '));
            output.push(`\\end{quote}`);
            continue;
        }

        // ── Listas ────────────────────────────────────────────
        if (line.match(/^(\s*)([-*+]|\d+\.) /)) {
            const listLines = [];
            while (i < lines.length && (lines[i].match(/^(\s*)([-*+]|\d+\.) /) || (lines[i].trim() === '' && i + 1 < lines.length && lines[i + 1].match(/^\s+([-*+]|\d+\.) /)))) {
                if (lines[i].trim() !== '') listLines.push(lines[i]);
                i++;
            }
            output.push(listToLatex(listLines));
            continue;
        }

        // ── Separador horizontal ─────────────────────────────
        if (line.match(/^[-*_]{3,}$/)) {
            output.push('\\medskip\n\\hrule\n\\medskip');
            i++;
            continue;
        }

        // ── Linha vazia ───────────────────────────────────────
        if (line.trim() === '') {
            output.push('');
            i++;
            continue;
        }

        // ── Parágrafo normal ─────────────────────────────────
        output.push(inlineToLatex(line));
        i++;
    }

    return output.join('\n');
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
                '\\titleformat{\\section}[hang]{\\large\\bfseries}{}{{0pt}}{}[\\vspace{2pt}\\hrule\\vspace{2pt}]',
                '\\titleformat{\\subsection}[hang]{\\normalsize\\itshape}{}{{0pt}}{}',
            ].join('\n'),
        },
        technical: {
            fontPkg:      '\\usepackage{bookman}',
            extraPkgs:    '\\usepackage[final]{microtype}',
            linespread:   '1.15',
            sectionStyle: [
                '\\usepackage{titlesec}',
                '\\titleformat{\\section}[block]{\\large\\bfseries\\sffamily}{}{{0pt}}{}[\\vspace{1pt}\\hrule]',
                '\\titleformat{\\subsection}[block]{\\normalsize\\bfseries\\sffamily}{}{{0pt}}{}',
            ].join('\n'),
        },
        minimal: {
            fontPkg:      '\\usepackage{charter}',
            extraPkgs:    '',
            linespread:   '1.35',
            sectionStyle: [
                '\\usepackage{titlesec}',
                '\\titleformat{\\section}[hang]{\\large\\scshape}{}{{0pt}}{}',
                '\\titleformat{\\subsection}[hang]{\\normalsize\\itshape}{}{{0pt}}{}',
            ].join('\n'),
        },
        corporate: {
            fontPkg:      '\\usepackage{helvet}\n\\renewcommand{\\familydefault}{\\sfdefault}',
            extraPkgs:    '\\usepackage[final]{microtype}',
            linespread:   '1.1',
            sectionStyle: [
                '\\usepackage{titlesec}',
                '\\titleformat{\\section}[block]{\\large\\bfseries\\sffamily}{}{{0pt}}{}',
                '\\titleformat{\\subsection}[block]{\\normalsize\\bfseries\\sffamily}{}{{0pt}}{}',
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

    const headerFontSize = globalSetup.headerFontSize || 9;
    const footerFontSize = globalSetup.footerFontSize || 9;
    const hFontCmd = `\\fontsize{${headerFontSize}pt}{${Math.round(headerFontSize * 1.2)}pt}\\selectfont`;
    const fFontCmd = `\\fontsize{${footerFontSize}pt}{${Math.round(footerFontSize * 1.2)}pt}\\selectfont`;

    const fancyLines = mirror
        ? [
            `\\fancyfoot[LE,RO]{${fFontCmd}\\thepage}`,
            `\\fancyhead[RE]{${hFontCmd}${headerEvenText}}`,
            `\\fancyhead[LO]{${hFontCmd}${headerOddText}}`
        ]
        : [
            `\\fancyfoot[C]{${fFontCmd}\\thepage}`,
            `\\fancyhead[L]{${hFontCmd}${headerEvenText}}`,
            `\\fancyhead[R]{}` // Ensure right side is empty if not mirror
        ];

    const preamble = [
        '% Generated by BlockTeX IDE',
        `\\documentclass[${docClassOpts.join(',')}]{book}`,
        '\\raggedbottom',
        '',
        '% ─── Geometry ───────────────────────────────────────',
        `\\usepackage[${geoOpts.join(',\n  ')}]{geometry}`,
        '',
        '% ─── Language & Encoding ────────────────────────────',
        '\\usepackage[utf8]{inputenc}',
        '\\usepackage[T1]{fontenc}',
        '\\usepackage[brazilian]{babel}',
        '\\AtBeginDocument{\\shorthandoff{"}}',
        '',
        '% ─── Typography ─────────────────────────────────────',
        fontPkg.trim() || '% (fonte padrão LaTeX)',
        themeConfig.extraPkgs  ? themeConfig.extraPkgs : '',
        themeConfig.sectionStyle ? themeConfig.sectionStyle : '',
        '',
        '% ─── Mathematics ────────────────────────────────────',
        '\\usepackage{amsmath}',
        '\\usepackage{amssymb}',
        '\\usepackage{newunicodechar}',
        '\\newunicodechar{á}{\\ifmmode\\text{\\char225\\relax}\\else\\char225\\relax\\fi}',
        '\\newunicodechar{ã}{\\ifmmode\\text{\\char227\\relax}\\else\\char227\\relax\\fi}',
        '\\newunicodechar{â}{\\ifmmode\\text{\\char226\\relax}\\else\\char226\\relax\\fi}',
        '\\newunicodechar{à}{\\ifmmode\\text{\\char224\\relax}\\else\\char224\\relax\\fi}',
        '\\newunicodechar{é}{\\ifmmode\\text{\\char233\\relax}\\else\\char233\\relax\\fi}',
        '\\newunicodechar{ê}{\\ifmmode\\text{\\char234\\relax}\\else\\char234\\relax\\fi}',
        '\\newunicodechar{í}{\\ifmmode\\text{\\char237\\relax}\\else\\char237\\relax\\fi}',
        '\\newunicodechar{ó}{\\ifmmode\\text{\\char243\\relax}\\else\\char243\\relax\\fi}',
        '\\newunicodechar{õ}{\\ifmmode\\text{\\char245\\relax}\\else\\char245\\relax\\fi}',
        '\\newunicodechar{ô}{\\ifmmode\\text{\\char244\\relax}\\else\\char244\\relax\\fi}',
        '\\newunicodechar{ú}{\\ifmmode\\text{\\char250\\relax}\\else\\char250\\relax\\fi}',
        '\\newunicodechar{ç}{\\ifmmode\\text{\\char231\\relax}\\else\\char231\\relax\\fi}',
        '\\newunicodechar{Á}{\\ifmmode\\text{\\char193\\relax}\\else\\char193\\relax\\fi}',
        '\\newunicodechar{Ã}{\\ifmmode\\text{\\char195\\relax}\\else\\char195\\relax\\fi}',
        '\\newunicodechar{Â}{\\ifmmode\\text{\\char194\\relax}\\else\\char194\\relax\\fi}',
        '\\newunicodechar{À}{\\ifmmode\\text{\\char192\\relax}\\else\\char192\\relax\\fi}',
        '\\newunicodechar{É}{\\ifmmode\\text{\\char201\\relax}\\else\\char201\\relax\\fi}',
        '\\newunicodechar{Ê}{\\ifmmode\\text{\\char202\\relax}\\else\\char202\\relax\\fi}',
        '\\newunicodechar{Í}{\\ifmmode\\text{\\char205\\relax}\\else\\char205\\relax\\fi}',
        '\\newunicodechar{Ó}{\\ifmmode\\text{\\char211\\relax}\\else\\char211\\relax\\fi}',
        '\\newunicodechar{Õ}{\\ifmmode\\text{\\char213\\relax}\\else\\char213\\relax\\fi}',
        '\\newunicodechar{Ô}{\\ifmmode\\text{\\char212\\relax}\\else\\char212\\relax\\fi}',
        '\\newunicodechar{Ú}{\\ifmmode\\text{\\char218\\relax}\\else\\char218\\relax\\fi}',
        '\\newunicodechar{Ç}{\\ifmmode\\text{\\char199\\relax}\\else\\char199\\relax\\fi}',
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
        '\\usepackage{tabularx}',
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
        '           {Ú}{{\\\'U}}1 {Ç}{{\\c{C}}}1',
        '           {├}{{|-}}2 {─}{{-}}1 {└}{{\\textbackslash-}}2 {│}{{|}}1',
        '           {←}{{<-}}2 {→}{{->}}2 {↑}{{\\ensuremath{\\uparrow}}}1 {↓}{{\\ensuremath{\\downarrow}}}1 {—}{{---}}1 {–}{{--}}1 {“}{{"}}1 {”}{{"}}1 {‘}{{\'}}1 {’}{{\'}}1,',
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
        mirror ? `  \\fancyfoot[LE,RO]{${fFontCmd}\\thepage}` : `  \\fancyfoot[C]{${fFontCmd}\\thepage}`,
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
function blockToLatex(block, mirror = false) {
    const { type, content, config = {}, style_variables = {} } = block;
    const { page_break, toc_visible = true } = config;

    let tex = '';
    const breakCmd = mirror ? '\\cleardoublepage' : '\\clearpage';

    // Page break: isolated = cleardoublepage (starts on right/odd page)
    if (page_break === 'isolated') {
        tex += '\\cleardoublepage\n\n';
    } else if (page_break === 'before') {
        tex += `${breakCmd}\n\n`;
    }

    switch (type) {
        case BLOCK_TYPES.COVER:
            tex += `\\thispagestyle{empty}\n\\begingroup\n\\LARGE\n${mdToLatex(content, config)}\n\\endgroup\n${breakCmd}\n`;
            break;

        // CHAPTER e CONTENT (legado) geram o mesmo LaTeX
        case BLOCK_TYPES.CHAPTER:
        case BLOCK_TYPES.CONTENT: // migração: projetos antigos podem ter blocos 'content'
            if (!toc_visible) tex += `\\begingroup\\let\\addcontentsline\\@gobblethree\n`;
            tex += `\\begin{btxbody}\n${mdToLatex(content, config)}\n\\end{btxbody}\n`;
            if (!toc_visible) tex += `\\endgroup\n`;
            break;

        case BLOCK_TYPES.QUOTE: {
            const rawColor = (style_variables.color || '#6366f1').replace('#', '');
            // Garante 6 dígitos hex válidos
            const hexColor = /^[0-9A-Fa-f]{6}$/.test(rawColor) ? rawColor : '6366F1';
            tex += `{\\color[HTML]{${hexColor}}\n\\begin{quotation}\n${mdToLatex(content, config)}\n\\end{quotation}}\n`;
            break;
        }

        case BLOCK_TYPES.CODE:
            tex += mdToLatex(content, config) + '\n';
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
                tex += mdToLatex(content, config) + '\n';
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
                    if (content && !content.match(/^<!--/)) tex += mdToLatex(content, config) + '\n';
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
            tex += mdToLatex(content, config) + '\n';
            break;
        }

        default:
            tex += mdToLatex(content, config) + '\n';
    }

    tex += '\n';
    return tex;
}

// ============================================================
// Generate full .tex document from project data
// ============================================================
export function generateTex(projectData) {
    const { metadata, global_setup, blocks } = projectData;

    let tex = generatePreamble(global_setup, metadata);

    for (const block of blocks) {
        tex += blockToLatex(block, global_setup.mirror);
    }

    tex += '\n\\end{document}\n';

    return tex;
}

// ============================================================
// Generate HTML preview (approximation)
// ============================================================
export function generateHtmlPreview(blocks) {
    let html = '';

    for (const block of blocks) {
        const { type, content, config = {} } = block;
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
                blockHtml = markdownToHtml(content);
        }

        html += blockHtml;
    }

    return html;
}

function markdownToHtml(md) {
    if (!md || md.startsWith('<!--')) {
        return `<p style="color:#aaa;font-style:italic">(Elemento de mídia)</p>`;
    }

    let html = md;
    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/gm, (_, lang, code) => `<pre><code class="language-${lang}">${code}</code></pre>`);
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^---+$/gm, '<hr>');
    html = html.replace(/\n{2,}/g, '</p><p>');
    html = `<p>${html}</p>`;
    return html;
}

export { mdToLatex, escapeLatex };
