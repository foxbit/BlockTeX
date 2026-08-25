// ============================================================
// Gera um arquivo EPUB 3 a partir de capítulos HTML.
// Estrutura do EPUB (um ZIP com regras específicas):
//   mimetype                     → obrigatório, SEM compressão (STORE)
//   META-INF/container.xml       → aponta para o content.opf
//   OEBPS/content.opf            → manifest + spine + metadata
//   OEBPS/toc.ncx                → índice (EPUB2, compatível com leitores)
//   OEBPS/nav.xhtml              → navegação EPUB3
//   OEBPS/style.css              → estilos tipográficos
//   OEBPS/chapter_XXXX.xhtml     → um arquivo por capítulo
//   OEBPS/images/*.ext           → imagens referenciadas no conteúdo
// ============================================================
const JSZip = require('jszip');
const crypto = require('crypto');

const MIME = 'application/epub+zip';

// Identificador único estável (UUID v4)
function genUuid() {
    return crypto.randomUUID();
}

// Escapa texto para uso em XML/atributos
function xmlEscape(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Extrai o tipo MIME de um nome de arquivo de imagem
function mimeForImage(filename) {
    const ext = String(filename).split('.').pop().toLowerCase();
    switch (ext) {
        case 'png': return 'image/png';
        case 'gif': return 'image/gif';
        case 'webp': return 'image/webp';
        case 'svg': return 'image/svg+xml';
        case 'jpeg':
        case 'jpg':
        default: return 'image/jpeg';
    }
}

module.exports = { generateEpub, xmlEscape, mimeForImage };

// ============================================================
// Constrói o content.opf (manifest + spine + metadata)
// ============================================================
function buildOpf({ title, author, language, chapters, imageFiles, uuid }) {
    const manifest = [
        '    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
        '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
        '    <item id="css" href="style.css" media-type="text/css"/>',
    ];

    const spine = [
        '    <itemref idref="nav"/>',
    ];

    chapters.forEach((ch, i) => {
        const id = `chap${i + 1}`;
        manifest.push(`    <item id="${id}" href="chapter_${String(i + 1).padStart(4, '0')}.xhtml" media-type="application/xhtml+xml"/>`);
        spine.push(`    <itemref idref="${id}"/>`);
    });

    Object.keys(imageFiles || {}).forEach((fname, i) => {
        const id = `img${i + 1}`;
        manifest.push(`    <item id="${id}" href="images/${fname}" media-type="${mimeForImage(fname)}"/>`);
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${xmlEscape(language)}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${xmlEscape(uuid)}</dc:identifier>
    <dc:title>${xmlEscape(title)}</dc:title>
    <dc:language>${xmlEscape(language)}</dc:language>
    <dc:creator>${xmlEscape(author)}</dc:creator>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
${manifest.join('\n')}
  </manifest>
  <spine toc="ncx">
${spine.join('\n')}
  </spine>
</package>
`;
}

// ============================================================
// Constrói o toc.ncx (índice EPUB2 — compatível com todos leitores)
// ============================================================
function buildNcx({ title, chapters, uuid }) {
    const navPoints = chapters.map((ch, i) => `    <navPoint id="np${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${xmlEscape(ch.title || `Capítulo ${i + 1}`)}</text></navLabel>
      <content src="chapter_${String(i + 1).padStart(4, '0')}.xhtml"/>
    </navPoint>`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${xmlEscape(uuid)}"/></head>
  <docTitle><text>${xmlEscape(title)}</text></docTitle>
  <navMap>
${navPoints.join('\n')}
  </navMap>
</ncx>
`;
}

// ============================================================
// Constrói o nav.xhtml (navegação EPUB3)
// ============================================================
function buildNav({ title, chapters }) {
    const links = chapters.map((ch, i) => `      <li><a href="chapter_${String(i + 1).padStart(4, '0')}.xhtml">${xmlEscape(ch.title || `Capítulo ${i + 1}`)}</a></li>`);

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="pt-BR">
  <head><title>Índice</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>Índice</h1>
      <ol>
${links.join('\n')}
      </ol>
    </nav>
  </body>
</html>
`;
}

// ============================================================
// Função principal: monta o ZIP do EPUB
// Recebe { title, author, language, chapters, imageFiles }
//   chapters: [{ title, content (HTML) }]
//   imageFiles: { 'nome.ext': Buffer|base64 } — referenciados como images/nome.ext
// ============================================================
async function generateEpub({ title, author, language = 'pt', chapters = [], imageFiles = {} }) {
    const uuid = genUuid();
    const zip = new JSZip();

    // ── Arquivo mimetype: obrigatório, SEM compressão, primeiro ──
    zip.file('mimetype', MIME, { compression: 'STORE' });

    // ── container.xml ──
    zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`);

    // ── Capítulos XHTML ──
    chapters.forEach((ch, i) => {
        const fname = `chapter_${String(i + 1).padStart(4, '0')}.xhtml`;
        const body = ch.content || '<p></p>';
        zip.file(`OEBPS/${fname}`, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
  <head><title>${xmlEscape(ch.title || `Capítulo ${i + 1}`)}</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
  </head>
  <body>
    <section epub:type="chapter" xmlns:epub="http://www.idpf.org/2007/ops">
      <header>
        <h1 class="chapter-title">${xmlEscape(ch.title || `Capítulo ${i + 1}`)}</h1>
      </header>
      ${body}
    </section>
  </body>
</html>
`);
    });

    // ── CSS ──
    zip.file('OEBPS/style.css', `body {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.7;
  margin: 1.5em 2em;
  color: #222;
  font-size: 1em;
}
h1, h2, h3, h4 {
  line-height: 1.25;
  margin-top: 1.4em;
  margin-bottom: 0.5em;
  font-weight: 600;
  page-break-after: avoid;
}
h1.chapter-title {
  font-size: 1.6em;
  margin-bottom: 1em;
  border-bottom: 2px solid #ccc;
  padding-bottom: 0.3em;
  page-break-before: always;
}
p {
  text-align: justify;
  margin: 0 0 0.9em 0;
  text-indent: 1.2em;
}
p:first-of-type { text-indent: 0; }
blockquote {
  margin: 1.2em 2em;
  font-style: italic;
  color: #444;
}
img {
  max-width: 100%;
  height: auto;
}
figure { margin: 1.2em 0; text-align: center; }
figcaption { font-size: 0.85em; color: #666; font-style: italic; margin-top: 0.4em; }
table { border-collapse: collapse; margin: 1em 0; }
td, th { border: 1px solid #ccc; padding: 4px 8px; }
pre, code { font-family: 'Courier New', monospace; background: #f4f4f4; }
pre { padding: 10px; overflow-wrap: break-word; white-space: pre-wrap; }
a { color: #1a4d8f; }
`);

    // ── Images ──
    Object.keys(imageFiles || {}).forEach((fname) => {
        const data = imageFiles[fname];
        const buff = Buffer.isBuffer(data)
            ? data
            : Buffer.from(String(data).replace(/^data:[^;]+;base64,/, ''), 'base64');
        zip.file(`OEBPS/images/${fname}`, buff);
    });

    // ── OPF, NCX e NAV ──
    zip.file('OEBPS/content.opf', buildOpf({ title, author, language, chapters, imageFiles, uuid }));
    zip.file('OEBPS/toc.ncx', buildNcx({ title, chapters, uuid }));
    zip.file('OEBPS/nav.xhtml', buildNav({ title, chapters }));

    // ── Gera o buffer final ──
    const buf = await zip.generateAsync({
        type: 'nodebuffer',
        mimeType: MIME,
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });
    return buf;
}