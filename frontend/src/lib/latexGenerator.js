import { BLOCK_TYPES, PAPER_SIZES } from './blockTypes.js';

// ============================================================
// Escapa caracteres LaTeX especiais (EXCETO math modes)
// ============================================================
function escapeLatex(str, insideMath = false) {
    if (insideMath) return str; // Não escapar dentro de math
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
    return str
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/#/g, '\\#')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/</g, '\\textless{}')
        .replace(/>/g, '\\textgreater{}');
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

    const colSpec = aligns.join('|');
    const headerRow = headers.map(h => inlineToLatex(h)).join(' & ');
    const bodyRows = rows.map(r =>
        r.map((c, i) => inlineToLatex(c || '')).join(' & ')
    ).join(' \\\\\ \n');

    return [
        `\\begin{table}[H]`,
        `  \\centering`,
        `  \\begin{tabular}{|${colSpec}|}`,
        `    \\hline`,
        `    ${headerRow} \\\\`,
        `    \\hline`,
        bodyRows ? `    ${bodyRows} \\\\` : '',
        `    \\hline`,
        `  \\end{tabular}`,
        `\\end{table}`,
    ].filter(Boolean).join('\n');
}

// ============================================================
// Converte inline markdown (bold, italic, code, math, links)
// ============================================================
function inlineToLatex(text) {
    let t = text;

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

    // Escapa caracteres LaTeX no texto normal
    t = t
        .replace(/&/g, '\\&')
        .replace(/%(?!\x00)/g, '\\%')
        .replace(/#/g, '\\#')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/\\/g, '\\textbackslash{}');

    // Bold + Italic combinado (***texto***)
    t = t.replace(/\*\*\*(.+?)\*\*\*/g, (_, x) => `\\textbf{\\textit{${x}}}`);
    // Bold (**texto** ou __texto__)
    t = t.replace(/\*\*(.+?)\*\*/gs, (_, x) => `\\textbf{${x}}`);
    t = t.replace(/__(.+?)__/gs, (_, x) => `\\textbf{${x}}`);
    // Italic (*texto* ou _texto_)
    t = t.replace(/\*(.+?)\*/gs, (_, x) => `\\textit{${x}}`);
    t = t.replace(/(?<![a-zA-Z0-9])_([^_\n]+?)_(?![a-zA-Z0-9])/g, (_, x) => `\\textit{${x}}`);

    // Links [texto](url)
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
        `\\href{${url}}{${label}}`
    );

    // Restaura placeholders
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
    const lines = md.split('\n');
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
            const title = escapeLatexTitle(hMatch[2].replace(/\*\*(.+?)\*\*/g, '$1'));
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
        if (line.startsWith('> ')) {
            const quoteLines = [];
            while (i < lines.length && lines[i].startsWith('> ')) {
                quoteLines.push(lines[i].slice(2));
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
// Generate LaTeX preamble from global settings
// ============================================================
function generatePreamble(globalSetup, metadata) {
    const {
        paper = 'a5',
        mirror = true,
        font = 'default',
        baseSize = '11pt',
        bleed = false,
        engine = 'pdflatex',
        customWidth,
        customHeight,
        innerMargin = '25mm',
        outerMargin = '20mm',
        topMargin = '25mm',
        bottomMargin = '20mm',
    } = globalSetup;

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
    let fontPkg = '';
    if (engine === 'lualatex') {
        fontPkg = '\\usepackage{fontspec}\n';
        if (font !== 'default') fontPkg += `\\setmainfont{${font}}\n`;
    } else {
        const fontMap = {
            palatino: '\\usepackage{palatino}',
            helvet: '\\usepackage{helvet}\n\\renewcommand{\\familydefault}{\\sfdefault}',
            garamond: '\\usepackage{garamondx}',
            libertine: '\\usepackage{libertine}',
            sourceserifpro: '\\usepackage[default]{sourceserifpro}',
            crimson: '\\usepackage{crimson}',
        };
        if (fontMap[font]) fontPkg = fontMap[font] + '\n';
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
        '',
        '% ─── Typography ─────────────────────────────────────',
        fontPkg.trim() || '% (fonte padrão LaTeX)',
        '',
        '% ─── Mathematics ────────────────────────────────────',
        '\\usepackage{amsmath}',
        '\\usepackage{amssymb}',
        '',
        '% ─── Graphics & Tables ──────────────────────────────',
        '\\usepackage{graphicx}',
        '\\usepackage{float}',
        '\\graphicspath{{./assets/}}',
        '\\usepackage{booktabs}',
        '\\usepackage{array}',
        '\\usepackage{longtable}',
        '',
        '% ─── Colors ─────────────────────────────────────────',
        '\\usepackage{xcolor}',
        '\\definecolor{accent}{HTML}{6366F1}',
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
        '\\renewcommand{\\headrulewidth}{0.4pt}',
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
        '\\usepackage{parskip}',
        '\\usepackage{emptypage} % Remove cabeçalhos de páginas em branco vazias',
        '\\setlength{\\parindent}{0pt}',
        '\\setlength{\\parskip}{8pt}',
        '',
        '% ─── Title ──────────────────────────────────────────',
        `\\title{${escapeLatexTitle(title)}}`,
        `\\author{${escapeLatexTitle(author)}}`,
        `\\date{${date}}`,
        '',
        '\\begin{document}',
        '',
        '\\maketitle',
        mirror ? '\\cleardoublepage' : '',
        '',
    ].filter(Boolean).join('\n');

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
        tex += '\\cleardoublepage\n';
    } else if (page_break === 'before') {
        tex += `${breakCmd}\n`;
    }

    switch (type) {
        case BLOCK_TYPES.COVER:
            tex += `\\thispagestyle{empty}\n\\begingroup\n\\LARGE\n${mdToLatex(content, config)}\n\\endgroup\n${breakCmd}\n`;
            break;

        case BLOCK_TYPES.CHAPTER:
            tex += mdToLatex(content, config) + '\n';
            break;

        case BLOCK_TYPES.CONTENT:
            if (!toc_visible) tex += `\\begingroup\\let\\addcontentsline\\@gobblethree\n`;
            tex += mdToLatex(content, config) + '\n';
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

        case BLOCK_TYPES.TOC:
            tex += `\\tableofcontents\n${breakCmd}\n`;
            break;

        case BLOCK_TYPES.SEPARATOR:
            tex += `\\vspace{12pt}\n\\hrule\n\\vspace{12pt}\n`;
            break;

        case BLOCK_TYPES.IMAGE: {
            const caption = style_variables.caption || '';
            const width = style_variables.width || '0.8';
            const imgMatch = content.match(/<!--\s*image:\s*(.+?)\s*-->/);
            if (imgMatch) {
                const imgPath = imgMatch[1].replace(/[^a-zA-Z0-9/_.-]/g, '_');
                tex += `\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=${width}\\textwidth]{assets/${imgPath}}\n`;
                if (caption) tex += `  \\caption{${escapeLatex(caption)}}\n`;
                tex += `\\end{figure}\n`;
            } else {
                tex += mdToLatex(content, config) + '\n';
            }
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
