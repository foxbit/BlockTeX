// ============================================================
// Block type definitions
// ============================================================
export const BLOCK_TYPES = {
    CONTENT:    'content',
    CHAPTER:    'chapter',
    IMAGE:      'image',       // Single image — inline or full page
    IMAGE_GRID: 'image_grid',  // Multi-image grid (2 stacked, 2 side-by-side, 4-grid)
    QUOTE:      'quote',
    CODE:       'code',
    TOC:        'toc',
    SEPARATOR:  'separator',
    COVER:      'cover',
    TESTIMONIAL:'testimonial',
};

export const BLOCK_TYPE_META = {
    [BLOCK_TYPES.CHAPTER]: {
        label: 'Capítulo',
        icon: '📖',
        iconClass: 'icon-chapter',
        tagClass: 'tag-violet',
        color: '#8b5cf6',
        default_content: '<h1>Título do Capítulo</h1><p>Escreva seu conteúdo aqui.</p><h2>Subseção</h2><p>Parágrafo de exemplo.</p>',
    },
    [BLOCK_TYPES.IMAGE]: {
        label: 'Imagem',
        icon: '🖼️',
        iconClass: 'icon-image',
        tagClass: 'tag-teal',
        color: '#14b8a6',
        default_content: '',
    },
    [BLOCK_TYPES.IMAGE_GRID]: {
        label: 'Grade de Imagens',
        icon: '📸',
        iconClass: 'icon-image-grid',
        tagClass: 'tag-teal',
        color: '#0891b2',
        default_content: '',
    },
    [BLOCK_TYPES.QUOTE]: {
        label: 'Citação',
        icon: '💬',
        iconClass: 'icon-quote',
        tagClass: 'tag-amber',
        color: '#f59e0b',
        default_content: '<blockquote><p>"Esta é uma citação inspiradora que o leitor irá lembrar."</p></blockquote><p>— Autor Desconhecido</p>',
    },
    [BLOCK_TYPES.CODE]: {
        label: 'Código',
        icon: '⚙️',
        iconClass: 'icon-code',
        tagClass: 'tag-green',
        color: '#10b981',
        default_content: '<pre><code class="language-python">def hello_world():\n    print("Hello, World!")</code></pre>',
    },
    [BLOCK_TYPES.TOC]: {
        label: 'Índice',
        icon: '📋',
        iconClass: 'icon-toc',
        tagClass: 'tag-rose',
        color: '#f43f5e',
        default_content: '<!-- TOC: Índice Automático --><p>Será gerado automaticamente pelo LaTeX.</p>',
    },
    [BLOCK_TYPES.SEPARATOR]: {
        label: 'Separador',
        icon: '—',
        iconClass: 'icon-separator',
        tagClass: 'tag-violet',
        color: '#8b5cf6',
        default_content: '<hr>',
    },
    [BLOCK_TYPES.COVER]: {
        label: 'Capa',
        icon: '📚',
        iconClass: 'icon-cover',
        tagClass: 'tag-indigo',
        color: '#6366f1',
        default_content: '<h1>Título do Livro</h1><p><strong>Subtítulo opcional</strong></p><p><em>Autor</em></p>',
    },
    [BLOCK_TYPES.TESTIMONIAL]: {
        label: 'Depoimento',
        icon: '🗣️',
        iconClass: 'icon-depoimento',
        tagClass: 'tag-orange',
        color: '#f97316',
        default_content: '<p>Meu nome é Maria Antônia Soares Seguins, popularmente conhecida como Maria Seguins... [adicione o texto aqui]</p>',
    },
};

export const BLOCK_CATEGORIES = [
    {
        label: 'Estrutura',
        types: [BLOCK_TYPES.COVER, BLOCK_TYPES.CHAPTER, BLOCK_TYPES.TOC, BLOCK_TYPES.SEPARATOR],
    },
    {
        label: 'Conteúdo',
        types: [BLOCK_TYPES.QUOTE, BLOCK_TYPES.CODE, BLOCK_TYPES.TESTIMONIAL],
    },
    {
        label: 'Imagens',
        types: [BLOCK_TYPES.IMAGE, BLOCK_TYPES.IMAGE_GRID],
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



export const LATEX_ENGINES = [
    { label: 'pdfLaTeX (Rápido)', value: 'pdflatex' },
    { label: 'LuaLaTeX (Fontes TrueType/OpenType)', value: 'lualatex' },
];

export const DOCUMENT_THEMES = [
    {
        value: 'default',
        label: 'Padrão (LaTeX Clássico)',
        font: 'Computer Modern',
        description: 'Computer Modern, estilo acadêmico tradicional.',
    },
    {
        value: 'editorial',
        label: 'Editorial',
        font: 'Palatino',
        description: 'Palatino com microtype, entrelinhamento amplo. Ideal para livros e ensaios.',
    },
    {
        value: 'technical',
        label: 'Técnico',
        font: 'Bookman',
        description: 'Bookman com microtype e títulos marcados. Ideal para manuais e documentação.',
    },
    {
        value: 'minimal',
        label: 'Minimalista',
        font: 'Charter',
        description: 'Charter com amplo espaço entre linhas. Leitura limpa e elegante.',
    },
    {
        value: 'corporate',
        label: 'Corporativo',
        font: 'Helvetica',
        description: 'Helvetica sans-serif, compacto e direto. Ideal para relatórios.',
    },
];

export function getFontCssFamily(fontValue, themeValue) {
    let base = fontValue;
    if (fontValue === 'default' && themeValue) {
        const theme = DOCUMENT_THEMES.find(t => t.value === themeValue);
        if (theme) {
            const f = theme.font.toLowerCase();
            if (f.includes('palatino')) base = 'palatino';
            else if (f.includes('bookman')) base = 'bookman';
            else if (f.includes('charter')) base = 'charter';
            else if (f.includes('helvetica')) base = 'helvet';
        }
    }

    switch (base) {
        case 'palatino': return "'Palatino Linotype', 'Book Antiqua', Palatino, serif";
        case 'helvet': return "'Helvetica Neue', Helvetica, Arial, sans-serif";
        case 'garamond': return "'EB Garamond', Garamond, serif";
        case 'libertine': return "'Linux Libertine', 'Times New Roman', serif";
        case 'sourceserifpro': return "'Source Serif Pro', 'Times New Roman', serif";
        case 'crimson': return "'Crimson Text', 'Times New Roman', serif";
        case 'bookman': return "'Bookman Old Style', serif";
        case 'charter': return "'Bitstream Charter', 'Times New Roman', serif";
        case 'default':
        default:
            return "'Computer Modern Serif', 'Times New Roman', serif";
    }
}

