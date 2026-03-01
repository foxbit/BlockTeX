// ============================================================
// Block type definitions
// ============================================================
export const BLOCK_TYPES = {
    CONTENT: 'content',
    CHAPTER: 'chapter',
    IMAGE: 'image',
    QUOTE: 'quote',
    CODE: 'code',
    TOC: 'toc',
    SEPARATOR: 'separator',
    COVER: 'cover',
};

export const BLOCK_TYPE_META = {
    [BLOCK_TYPES.CONTENT]: {
        label: 'Texto',
        icon: '📝',
        iconClass: 'icon-content',
        tagClass: 'tag-indigo',
        color: '#6366f1',
        default_content: '## Novo Capítulo\n\nEscreva seu conteúdo aqui usando **Markdown**.',
    },
    [BLOCK_TYPES.CHAPTER]: {
        label: 'Capítulo',
        icon: '📖',
        iconClass: 'icon-chapter',
        tagClass: 'tag-violet',
        color: '#8b5cf6',
        default_content: '# Título do Capítulo',
    },
    [BLOCK_TYPES.IMAGE]: {
        label: 'Imagem',
        icon: '🖼️',
        iconClass: 'icon-image',
        tagClass: 'tag-teal',
        color: '#14b8a6',
        default_content: '<!-- image: caminho/para/imagem.png -->\n_Legenda da imagem_',
    },
    [BLOCK_TYPES.QUOTE]: {
        label: 'Citação',
        icon: '💬',
        iconClass: 'icon-quote',
        tagClass: 'tag-amber',
        color: '#f59e0b',
        default_content: '> "Esta é uma citação inspiradora que o leitor irá lembrar."\n\n— Autor Desconhecido',
    },
    [BLOCK_TYPES.CODE]: {
        label: 'Código',
        icon: '⚙️',
        iconClass: 'icon-code',
        tagClass: 'tag-green',
        color: '#10b981',
        default_content: '```python\ndef hello_world():\n    print("Hello, World!")\n```',
    },
    [BLOCK_TYPES.TOC]: {
        label: 'Índice',
        icon: '📋',
        iconClass: 'icon-toc',
        tagClass: 'tag-rose',
        color: '#f43f5e',
        default_content: '<!-- TOC: Índice Automático -->\nSerá gerado automaticamente pelo LaTeX.',
    },
    [BLOCK_TYPES.SEPARATOR]: {
        label: 'Separador',
        icon: '—',
        iconClass: 'icon-separator',
        tagClass: 'tag-violet',
        color: '#8b5cf6',
        default_content: '---',
    },
    [BLOCK_TYPES.COVER]: {
        label: 'Capa',
        icon: '📚',
        iconClass: 'icon-cover',
        tagClass: 'tag-indigo',
        color: '#6366f1',
        default_content: '# Título do Livro\n\n**Subtítulo opcional**\n\n_Autor_',
    },
};

export const BLOCK_CATEGORIES = [
    {
        label: 'Estrutura',
        types: [BLOCK_TYPES.COVER, BLOCK_TYPES.CHAPTER, BLOCK_TYPES.TOC, BLOCK_TYPES.SEPARATOR],
    },
    {
        label: 'Conteúdo',
        types: [BLOCK_TYPES.CONTENT, BLOCK_TYPES.QUOTE, BLOCK_TYPES.IMAGE, BLOCK_TYPES.CODE],
    },
];

// ============================================================
// Paper sizes
// ============================================================
export const PAPER_SIZES = [
    { label: 'A4 (210×297mm)', value: 'a4', width: '210mm', height: '297mm' },
    { label: 'A5 (148×210mm)', value: 'a5', width: '148mm', height: '210mm' },
    { label: '16×23cm (Livro)', value: '16x23', width: '160mm', height: '230mm' },
    { label: '15×21cm (Bolso)', value: '15x21', width: '150mm', height: '210mm' },
    { label: 'US Letter', value: 'letter', width: '8.5in', height: '11in' },
    { label: 'Customizado', value: 'custom', width: null, height: null },
];

export const LATEX_FONTS = [
    { label: 'Padrão LaTeX (Computer Modern)', value: 'default' },
    { label: 'Times New Roman (Palatino)', value: 'palatino' },
    { label: 'Helvetica / Arial', value: 'helvet' },
    { label: 'Garamond', value: 'garamond' },
    { label: 'Libertine', value: 'libertine' },
    { label: 'Source Serif Pro', value: 'sourceserifpro' },
    { label: 'Crimson Text', value: 'crimson' },
];

export const LATEX_ENGINES = [
    { label: 'pdfLaTeX (Rápido)', value: 'pdflatex' },
    { label: 'LuaLaTeX (Fontes TrueType/OpenType)', value: 'lualatex' },
];
