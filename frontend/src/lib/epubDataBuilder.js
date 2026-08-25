// ============================================================
// Monta a estrutura de dados para o endpoint /api/compile-epub
// a partir do estado do projeto (blocos).
// Recebe project → { title, author, language, chapters, imageFiles }
// ============================================================
import { BLOCK_TYPES } from './blockTypes.js';

const imgExt = (mime) => {
    const map = {
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
    };
    return map[mime] || 'jpg';
};

// Converte um data URI (data:image/png;base64,XXXX) em { mime, base64 }
function parseDataUri(dataUri) {
    if (typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return null;
    const comma = dataUri.indexOf(',');
    if (comma === -1) return null;
    const meta = dataUri.slice(5, comma);
    const mime = meta.split(';')[0] || 'image/jpeg';
    return { mime, base64: dataUri.slice(comma + 1) };
}

// Sanitiza nome de arquivo para uso dentro do ZIP
function sanitizeFilename(name) {
    return String(name || 'img').replace(/[^a-zA-Z0-9._-]/g, '_');
}

// Registra uma imagem base64 no catálogo imageFiles e devolve o caminho EPUB
function registerImage(imageBase64, imageFiles, hint, idx) {
    const parsed = parseDataUri(imageBase64);
    if (!parsed) return null;
    const name = `${hint}_${idx}.${imgExt(parsed.mime)}`;
    imageFiles[name] = parsed.base64;
    return `images/${name}`;
}

// Bloco IMAGE único → <figure> com imagem + legenda
function imageBlockToHtml(block, imageFiles, idx) {
    const sv = block.style_variables || {};
    const src = registerImage(sv.imageBase64, imageFiles, 'img', idx);
    if (!src) return '';
    const caption = sv.caption ? `<figcaption>${sv.caption}</figcaption>` : '';
    return `<figure>${src ? `<img src="${src}" alt="${sv.caption || ''}" />` : ''}${caption}</figure>`;
}

// Bloco IMAGE_GRID → uma <figure> por slot preenchido
function imageGridToHtml(block, imageFiles, idx) {
    const sv = block.style_variables || {};
    let html = '';
    for (let i = 1; i <= 4; i++) {
        const b64 = sv[`image${i}Base64`];
        if (!b64) continue;
        const src = registerImage(b64, imageFiles, `grid${idx}`, i);
        if (!src) continue;
        const caption = sv[`caption${i}`] ? `<figcaption>${sv[`caption${i}`]}</figcaption>` : '';
        html += `<figure><img src="${src}" alt="${sv[`caption${i}`] || ''}" />${caption}</figure>`;
    }
    return html;
}

// Extrai o primeiro H1/H2 do conteúdo HTML (título do capítulo)
function extractTitle(html, fallback) {
    if (!html) return fallback;
    const m = html.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
    if (!m) return fallback;
    const text = m[1].replace(/<[^>]+>/g, '').trim();
    return text || fallback;
}

// ============================================================
// Agrupa os blocos do projeto em capítulos EPUB.
// chapters: [{ title, content }] — content é HTML já processado
// imageFiles: { 'nome.ext': base64 } — imagens referenciadas
// ============================================================
export function buildEpubData(project) {
    const metadata = project?.metadata || {};
    const blocks = project?.blocks || [];

    const title = metadata.title || 'Documento';
    const author = metadata.author || 'Autor';
    const language = 'pt';

    const imageFiles = {};
    const chapters = [];
    let current = null;      // { title, content: string[] }
    let imgIdx = 0;

    const flush = () => {
        if (current && current.content.join('').trim()) {
            chapters.push({ title: current.title, content: current.content.join('\n') });
        }
        current = null;
    };

    const ensureChapter = () => {
        if (!current) {
            current = { title: `Capítulo ${chapters.length + 1}`, content: [] };
        }
    };

    for (const block of blocks) {
        const sv = block.style_variables || {};
        const type = block.type;

        if (type === BLOCK_TYPES.CHAPTER) {
            flush();
            const chTitle = extractTitle(block.content, `Capítulo ${chapters.length + 1}`);
            current = { title: chTitle, content: [] };
            if (block.content) {
                // Remove o H1 do corpo (vira o título do capítulo) se ele for o primeiro elemento
                let body = block.content;
                const m = body.match(/^\s*<h[12][^>]*>[\s\S]*?<\/h[12]>\s*/i);
                if (m) body = body.slice(m[0].length);
                current.content.push(body);
            }
        } else if (type === BLOCK_TYPES.COVER) {
            flush();
            const coverTitle = extractTitle(block.content, title);
            current = { title: 'Capa', content: [] };
            current.content.push(block.content || `<h1>${title}</h1>`);
        } else if (type === BLOCK_TYPES.IMAGE) {
            ensureChapter();
            const html = imageBlockToHtml(block, imageFiles, imgIdx++);
            if (html) current.content.push(html);
        } else if (type === BLOCK_TYPES.IMAGE_GRID) {
            ensureChapter();
            const html = imageGridToHtml(block, imageFiles, imgIdx++);
            if (html) current.content.push(html);
        } else if (type === BLOCK_TYPES.SEPARATOR) {
            ensureChapter();
            current.content.push('<hr/>');
        } else if (type === BLOCK_TYPES.TOC) {
            ensureChapter();
            current.content.push('<p><em>Índice gerado automaticamente pelo leitor.</em></p>');
        } else {
            // CONTENT, QUOTE, CODE, TESTIMONIAL → HTML nativo do bloco
            if (!block.content || !block.content.trim()) continue;
            ensureChapter();
            if (type === BLOCK_TYPES.QUOTE) {
                current.content.push(`<blockquote>${block.content}</blockquote>`);
            } else {
                current.content.push(block.content);
            }
        }
    }
    flush();

    // Fallback: se não há nenhum capítulo, cria um vazio
    if (chapters.length === 0) {
        chapters.push({ title, content: '<p></p>' });
    }

    return { title, author, language, chapters, imageFiles };
}