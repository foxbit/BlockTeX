// ============================================================
// migrateContent.js — Migração de conteúdo legado (Markdown) → HTML nativo
//
// Usa o próprio `tiptap-markdown` (que GEROU o formato atual) num editor
// headless para produzir HTML nativo do TipTap. É usado SOMENTE no caminho
// de migração (ao carregar projetos antigos), nunca no editor em si.
// ============================================================
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Markdown } from 'tiptap-markdown';
import { Indent } from './indent.js';

// Marcadores de Markdown puro (inline ou bloco). Se o conteúdo os contém,
// trata-se de conteúdo legado que precisa ser convertido.
function isLegacyMarkdown(content) {
    if (!content) return false;
    if (typeof content !== 'string') return false;
    // Markdown inline/block markers
    if (/\*\*[^*]/.test(content) || /\*\s/.test(content)) return true;
    if (/^#{1,4}\s/m.test(content)) return true;
    if (/^>\s/m.test(content)) return true;
    if (/^[-*+]\s/m.test(content)) return true;
    if (/^\d+\.\s/m.test(content)) return true;
    if (/`[^`]+`/.test(content)) return true;
    if (/^---+$/m.test(content)) return true;
    // Comentários HTML legados (TOC, imagem)
    if (/<!--/.test(content)) return true;
    // HTML antigo com atributo `align=` (gerado pelo CustomParagraph/CustomHeading)
    if (/<(p|h[1-6])\s+[^>]*align="/i.test(content)) return true;
    return false;
}

// Pré-processa o markdown legado: o atributo HTML antigo `align="center"`
// (gerado pelo CustomParagraph) não é compreendido pelo TextAlign nativo,
// que espera `style="text-align: center"`. Convertemos antes de parsear.
function normalizeLegacyAlign(md) {
    return md.replace(
        /<(p|h[1-6])(\s+[^>]*)align="(center|right|left|justify)"([^>]*)>/gi,
        '<$1$2style="text-align: $3"$4>'
    );
}

// Reverte escapes espúrios (backslashes) que vazaram de round-trips antigos
// do conversor Markdown→LaTeX e ficaram gravados no banco. Exemplos:
//   \*\*negrito\*\*  -> **negrito**
//   \[colchete\]     -> [colchete]
//   Publicação\\ (x) -> Publicação (x)
//   $\frac{..}$      -> $\frac{..}$  (backslash duplicado em math)
function cleanSpuriousEscapes(md) {
    // Protege math $...$ (apenas quando contém backslash = comando LaTeX real)
    const mathBlocks = [];
    let out = md.replace(/\$[^$\n]*\\[^$\n]*\$/g, (m) => {
        mathBlocks.push(m);
        return `\x00MATH${mathBlocks.length - 1}\x00`;
    });

    // Reverte escapes espúrios fora de math
    out = out
        .replace(/\\\*/g, '*')          // \* -> *
        .replace(/\\\[/g, '[')          // \[ -> [
        .replace(/\\\]/g, ']')          // \] -> ]
        .replace(/\\\\ /g, ' ')         // \\ + espaço -> espaço
        .replace(/(?<!\\)\\ /g, ' ')    // \ + espaço -> espaço
        .replace(/\\$/gm, '')           // \ no fim de linha -> remove

    // Dentro de math: backslash duplicado -> simples
    mathBlocks.forEach((block, i) => {
        const cleaned = block.replace(/\\\\/g, '\\');
        out = out.split(`\x00MATH${i}\x00`).join(cleaned);
    });
    return out;
}

// Converte Markdown legado → HTML nativo do TipTap.
export function markdownToHtml(md) {
    if (!md) return '';
    const cleaned = cleanSpuriousEscapes(md);
    const normalized = normalizeLegacyAlign(cleaned);
    const editor = new Editor({
        extensions: [
            StarterKit,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Indent,
            Markdown.configure({ html: true, transformPastedText: true }),
        ],
        content: normalized,
    });
    try {
        return editor.getHTML();
    } finally {
        editor.destroy();
    }
}

// Migra o conteúdo de um bloco se necessário (idempotente).
export function migrateBlockContent(content) {
    if (!content) return content;
    if (!isLegacyMarkdown(content)) return content;
    try {
        return markdownToHtml(content);
    } catch (e) {
        console.warn('[migrateContent] Falha ao migrar bloco:', e);
        return content; // fallback: mantém o conteúdo como está (não perde dados)
    }
}
