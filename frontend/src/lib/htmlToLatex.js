// ============================================================
// htmlToLatex.js — Conversor único HTML → LaTeX
// Substitui mdToLatex / inlineToLatex / markdownToHtml.
// O conteúdo dos blocos agora é HTML nativo do TipTap (getHTML()).
// ============================================================
/* eslint-disable no-control-regex -- placeholders \x00 (herdados do conversor antigo) */

// ============================================================
// Remove emojis e símbolos pictográficos que o pdflatex não suporta.
// IMPORTANTE: não remover caracteres latinos acentuados (á, ã, é, etc.)
// ============================================================
export function stripEmojis(str) {
    if (!str) return str;
    return str
        .replace(/[\u{10000}-\u{10FFFF}]/gu, '')
        .replace(/[\uD800-\uDFFF]/g, '')
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
        .replace(/[\uFE00-\uFE0F]/g, '');
}

// Placeholders usados para evitar o bug de ordem no escape:
// escapar '\' para \textbackslash{} e '{'/'}' para \{/\} introduz novos
// caracteres que NÃO podem ser re-processados. Usamos sentinelas.
const BS = '\u0000B\u0000'; // backslash
const OB = '\u0000O\u0000'; // open brace
const CB = '\u0000C\u0000'; // close brace

// ============================================================
// Escapa caracteres LaTeX especiais de forma SEGURA (sem re-escape)
// ============================================================
export function escapeLatex(str) {
    if (!str) return str;
    str = stripEmojis(str);
    // Passo 1: protege os 3 caracteres problemáticos
    str = str
        .split('\\').join(BS)
        .split('{').join(OB)
        .split('}').join(CB);
    // Passo 2: escapa os demais (podem introduzir {}, mas são frescos)
    str = str
        .split('&').join('\\&')
        .split('%').join('\\%')
        .split('#').join('\\#')
        .replace(/\^/g, '\\^{}')
        .split('~').join('\\textasciitilde{}')
        .split('<').join('\\textless{}')
        .split('>').join('\\textgreater{}')
        .split('$').join('\\$')
        .split('_').join('\\_');
    // Passo 3: restaura os placeholders
    str = str
        .split(OB).join('\\{')
        .split(CB).join('\\}')
        .split(BS).join('\\textbackslash{}');
    return str;
}

// Escapa apenas para uso em argumentos de comandos LaTeX (títulos, etc.)
export function escapeLatexTitle(str) {
    if (!str) return str;
    str = stripEmojis(str);
    str = str
        .split('\\').join(BS)
        .split('{').join(OB)
        .split('}').join(CB);
    str = str
        .split('&').join('\\&')
        .split('%').join('\\%')
        .split('#').join('\\#')
        .split('~').join('\\textasciitilde{}')
        .split('<').join('\\textless{}')
        .split('>').join('\\textgreater{}')
        .split('$').join('\\$')
        .split('_').join('\\_');
    str = str
        .split(OB).join('\\{')
        .split(CB).join('\\}')
        .split(BS).join('\\textbackslash{}');
    return str;
}

// ============================================================
// Helpers de DOM
// ============================================================

// Extrai o alinhamento de um nó (style text-align ou attribute align)
function getAlign(node) {
    const align = node.getAttribute && node.getAttribute('align');
    if (align) return align.toLowerCase();
    const style = node.getAttribute && (node.getAttribute('style') || '');
    const m = style.match(/text-align:\s*(center|right|left|justify)/i);
    return m ? m[1].toLowerCase() : null;
}

// Escapa texto puro de um nó de texto, preservando espaços múltiplos e nbsp,
// e protegendo math inline $...$ / $$...$$ (não deve ser escapado).
function escapeInlineText(text) {
    if (!text) return '';
    // Protege math inline/display antes de escapar
    const mathPlaceholders = [];
    let t = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => {
        mathPlaceholders.push(`\\[${m}\\]`);
        return `\x00MATH${mathPlaceholders.length - 1}\x00`;
    });
    t = t.replace(/(?<!\\)\$([^$\n]+?)\$(?!\$)/g, (_, m) => {
        mathPlaceholders.push(`$${m}$`);
        return `\x00MATH${mathPlaceholders.length - 1}\x00`;
    });

    t = escapeLatex(t);
    // Espaços não-quebráveis e espaços múltiplos → '~' (espaço não-quebrável LaTeX)
    t = t.replace(/\u00A0/g, '~');
    t = t.replace(/ {2,}/g, m => ' ' + '~'.repeat(m.length - 1));

    // Restaura math
    t = t.replace(/\x00MATH(\d+)\x00/g, (_, i) => mathPlaceholders[+i]);
    return t;
}

// ============================================================
// Conversão inline (marcas de formatação)
// ============================================================
function inlineNodesToLatex(node) {
    if (!node) return '';
    // Nó de texto
    if (node.nodeType === 3) {
        return escapeInlineText(node.textContent);
    }
    if (node.nodeType !== 1) return '';

    const tag = node.tagName.toLowerCase();
    const children = () => {
        let out = '';
        for (const child of node.childNodes) out += inlineNodesToLatex(child);
        return out;
    };

    switch (tag) {
        case 'strong':
        case 'b':
            return `\\textbf{${children()}}`;
        case 'em':
        case 'i':
            return `\\textit{${children()}}`;
        case 'u':
            return `\\underline{${children()}}`;
        case 's':
        case 'strike':
        case 'del':
            // FASE 3: riscado requer pacote ulem (\sout), indisponível no Alpine.
            // Por ora, preserva o texto sem riscado (sem gerar LaTeX inválido).
            return children();
        case 'code':
            return `\\texttt{${escapeBraces(node.textContent || '')}}`;
        case 'a': {
            const href = (node.getAttribute('href') || '').replace(/([%#\\])/g, '\\$1');
            return `\\href{${href}}{${children()}}`;
        }
        case 'mark':
            // FASE 3: marca-texto requer pacote soul (\hl), indisponível no Alpine.
            return children();
        case 'sub':
            return `\\textsubscript{${children()}}`;
        case 'sup':
            return `\\textsuperscript{${children()}}`;
        case 'br':
            return ' \\\\';
        case 'span': {
            const style = node.getAttribute('style') || '';
            const colorMatch = style.match(/color:\s*([^;]+)/i);
            if (colorMatch) {
                const color = colorMatch[1].trim();
                return `\\textcolor{${color}}{${children()}}`;
            }
            return children();
        }
        default:
            return children();
    }
}

function escapeBraces(text) {
    return (text || '').replace(/[{}]/g, '\\$&');
}

// ============================================================
// Conversão de blocos
// ============================================================

function headingToLatex(node, config = {}) {
    const level = parseInt(node.tagName[1], 10) || 1;
    const rawTitle = (node.textContent || '').trim();
    if (!rawTitle || /^[\\\s]+$/.test(rawTitle)) return '';

    const title = escapeLatexTitle(rawTitle);
    const cmd = ['chapter', 'section', 'subsection', 'subsubsection'][level - 1] || 'section';
    const align = getAlign(node);

    let out;
    if (align === 'center') {
        out = `{\\centering\\${cmd}*{${title}}\\par}`;
    } else if (align === 'right') {
        out = `{\\raggedleft\\${cmd}*{${title}}\\par}`;
    } else {
        out = `\\${cmd}*{${title}}`;
    }

    // Atualiza os cabeçalhos (fancyhdr)
    if (level === 1) {
        out += `\n\\markboth{${title}}{}`;
    } else if (level === 2) {
        out += `\n\\markright{${title}}`;
    }

    if (config.toc_headers && config.toc_headers[`h${level}`]) {
        out += `\n\\addcontentsline{toc}{${cmd}}{${title}}`;
    }

    return out;
}

function paragraphToLatex(node) {
    const align = getAlign(node);
    const inner = inlineNodesToLatex(node);
    if (!inner.trim()) return '';

    if (align === 'center') {
        return `{\\centering ${inner} \\par}`;
    } else if (align === 'right') {
        return `{\\raggedleft ${inner} \\par}`;
    } else if (align === 'justify') {
        return `{\\justifying ${inner} \\par}`;
    }
    return inner;
}

function blockquoteToLatex(node) {
    const parts = [];
    for (const child of node.childNodes) {
        if (child.nodeType === 1 && child.tagName.toLowerCase() === 'p') {
            parts.push(inlineNodesToLatex(child));
        } else {
            parts.push(inlineNodesToLatex(child));
        }
    }
    const inner = parts.filter(Boolean).join(' ');
    return `\\begin{quote}\n${inner}\n\\end{quote}`;
}

function listToLatex(listNode, ordered, config = {}) {
    const items = [];
    for (const li of listNode.children) {
        if (li.tagName.toLowerCase() !== 'li') continue;
        let itemTex = '';
        let nested = '';
        for (const child of li.childNodes) {
            const isList = child.nodeType === 1 && (child.tagName.toLowerCase() === 'ul' || child.tagName.toLowerCase() === 'ol');
            if (isList) {
                nested += '\n' + listToLatex(child, child.tagName.toLowerCase() === 'ol', config);
            } else {
                itemTex += inlineNodesToLatex(child);
            }
        }
        items.push(`  \\item ${itemTex.trim()}${nested}`);
    }
    const env = ordered ? 'enumerate' : 'itemize';
    return `\\begin{${env}}\n${items.join('\n')}\n\\end{${env}}`;
}

const CODE_LANG_MAP = {
    'c++': 'C++', 'cpp': 'C++', 'python': 'Python', 'py': 'Python',
    'java': 'Java', 'bash': 'bash', 'sh': 'bash', 'sql': 'SQL',
    'html': 'HTML', 'xml': 'XML', 'c': 'C', 'php': 'PHP', 'ruby': 'Ruby'
};

function codeBlockToLatex(pre) {
    const code = pre.querySelector('code');
    const langClass = code ? (code.getAttribute('class') || '') : '';
    const langMatch = langClass.match(/language-([\w+-]+)/);
    const lang = langMatch ? langMatch[1].toLowerCase() : '';
    const text = code ? code.textContent : pre.textContent;
    const latexLang = CODE_LANG_MAP[lang];
    const head = latexLang ? `\\begin{lstlisting}[language=${latexLang}]` : '\\begin{lstlisting}';
    return `${head}\n${text}\n\\end{lstlisting}`;
}

function htmlTableToLatex(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    const parseRow = (tr) => Array.from(tr.querySelectorAll('th, td'))
        .map(c => inlineNodesToLatex(c).trim());

    const hasHeader = rows[0].querySelectorAll('th').length > 0;
    const headerCells = hasHeader ? parseRow(rows[0]) : null;
    const bodyRows = hasHeader ? rows.slice(1).map(parseRow) : rows.map(parseRow);
    const firstRow = parseRow(rows[0]);
    const nCols = (headerCells || firstRow).length;
    if (nCols === 0) return '';

    const colSpec = Array.from({ length: nCols }, () => '>{\\raggedright\\arraybackslash}X').join('|');

    const out = [];
    out.push('\\begin{table}[H]');
    out.push('  \\centering');
    out.push(`  \\begin{tabularx}{\\textwidth}{|${colSpec}|}`);
    out.push('    \\hline');
    if (headerCells) {
        out.push(`    ${headerCells.join(' & ')} \\\\`);
        out.push('    \\hline');
    }
    for (const r of bodyRows) {
        out.push(`    ${r.join(' & ')} \\\\`);
    }
    out.push('    \\hline');
    out.push('  \\end{tabularx}');
    out.push('\\end{table}');
    return out.join('\n');
}

function blockNodeToLatex(node, config = {}) {
    if (node.nodeType === 3) {
        const text = node.textContent;
        if (!text.trim()) return '';
        return inlineNodesToLatex(node);
    }
    if (node.nodeType !== 1) return '';

    const tag = node.tagName.toLowerCase();

    // Flags de revisão (marcações virtuais) não vão para o PDF
    if (tag === 'div' && node.getAttribute('data-type') === 'virtual-flag') {
        return '';
    }

    switch (tag) {
        case 'h1': case 'h2': case 'h3': case 'h4':
            return headingToLatex(node, config);
        case 'p':
            return paragraphToLatex(node);
        case 'blockquote':
            return blockquoteToLatex(node);
        case 'ul':
            return listToLatex(node, false, config);
        case 'ol':
            return listToLatex(node, true, config);
        case 'pre':
            return codeBlockToLatex(node);
        case 'table':
            return htmlTableToLatex(node);
        case 'hr':
            return '\\medskip\n\\hrule\n\\medskip';
        case 'div': {
            const parts = [];
            for (const child of node.childNodes) {
                const p = blockNodeToLatex(child, config);
                if (p) parts.push(p);
            }
            return parts.join('\n');
        }
        default: {
            const inner = inlineNodesToLatex(node);
            return inner.trim() ? inner : '';
        }
    }
}

// ============================================================
// Conversor principal
// ============================================================
export function htmlToLatex(html, config = {}) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const output = [];
    for (const node of doc.body.childNodes) {
        const tex = blockNodeToLatex(node, config);
        if (tex) output.push(tex);
    }
    return output.join('\n');
}
