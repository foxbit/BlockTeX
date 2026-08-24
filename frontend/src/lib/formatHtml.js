// Formatador de HTML para exibição legível no modo código.
// Insere quebras de linha e indentação apenas em nível de bloco,
// preservando o conteúdo inline (strong, em, span, a, texto etc.) numa única linha.
// Não usa DOMParser (que normalizaria entidades), apenas tokenização por tags.

const BLOCK_TAGS = new Set([
    'address', 'article', 'aside', 'blockquote', 'dd', 'div', 'dl', 'dt',
    'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3',
    'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre',
    'section', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
]);

const VOID_TAGS = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
    'meta', 'param', 'source', 'track', 'wbr'
]);

export function formatHtml(source) {
    if (!source) return '';
    const tokens = source.split(/(<\/?[a-zA-Z][^>]*>)/g).filter((t) => t !== '');
    let out = '';
    let indent = 0;

    for (const token of tokens) {
        const isTag = token.startsWith('<') && token.endsWith('>');
        if (!isTag) {
            // Texto entre tags: só inclui se houver conteúdo visível (ignora whitespace puro)
            if (token.trim().length > 0) {
                out += token;
            }
            continue;
        }

        const isComment = token.startsWith('<!--');
        if (isComment) {
            out += '\n' + '  '.repeat(indent) + token;
            continue;
        }

        const isClosing = /^<\//.test(token);
        const name = (token.match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)/) || [])[1] || '';
        const lower = name.toLowerCase();
        const isVoid = VOID_TAGS.has(lower);

        if (isClosing) {
            if (BLOCK_TAGS.has(lower)) {
                indent = Math.max(0, indent - 1);
                out += '\n' + '  '.repeat(indent) + token;
            } else {
                // Fechamento de tag inline permanece junto ao texto
                out += token;
            }
        } else {
            if (BLOCK_TAGS.has(lower)) {
                out += '\n' + '  '.repeat(indent) + token;
                if (!isVoid) indent += 1;
            } else {
                out += token;
            }
        }
    }

    return out.replace(/^\s+/, '');
}
