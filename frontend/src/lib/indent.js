// ============================================================
// indent.js — Extensão de recuo de parágrafo (Indent) compartilhada
// entre o editor TipTap e o migrador Markdown→HTML.
// ============================================================
import { Extension } from '@tiptap/core';

export const Indent = Extension.create({
    name: 'indent',

    addOptions() {
        return {
            types: ['paragraph', 'heading', 'blockquote'],
            minLevel: 0,
            maxLevel: 8,
        };
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    indentLevel: {
                        default: 0,
                        parseHTML: element => {
                            const levelAttr = element.getAttribute('data-indent');
                            if (levelAttr) {
                                const parsed = parseInt(levelAttr, 10);
                                return isNaN(parsed) ? 0 : parsed;
                            }
                            return 0;
                        },
                        renderHTML: attributes => {
                            if (!attributes.indentLevel || attributes.indentLevel <= 0) {
                                return {};
                            }
                            return {
                                'data-indent': attributes.indentLevel,
                            };
                        },
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            indent: () => ({ tr, state, dispatch, editor }) => {
                if (editor.can().sinkListItem('listItem')) {
                    return editor.commands.sinkListItem('listItem');
                }
                const { selection } = state;
                const { from, to } = selection;
                let updated = false;

                state.doc.nodesBetween(from, to, (node, pos) => {
                    if (this.options.types.includes(node.type.name)) {
                        const currentLevel = node.attrs.indentLevel || 0;
                        const nextLevel = Math.min(currentLevel + 1, this.options.maxLevel);
                        if (nextLevel !== currentLevel) {
                            if (dispatch) {
                                tr.setNodeMarkup(pos, undefined, {
                                    ...node.attrs,
                                    indentLevel: nextLevel,
                                });
                            }
                            updated = true;
                        }
                    }
                });

                return updated;
            },
            outdent: () => ({ tr, state, dispatch, editor }) => {
                if (editor.can().liftListItem('listItem')) {
                    return editor.commands.liftListItem('listItem');
                }
                const { selection } = state;
                const { from, to } = selection;
                let updated = false;

                state.doc.nodesBetween(from, to, (node, pos) => {
                    if (this.options.types.includes(node.type.name)) {
                        const currentLevel = node.attrs.indentLevel || 0;
                        const nextLevel = Math.max(currentLevel - 1, this.options.minLevel);
                        if (nextLevel !== currentLevel) {
                            if (dispatch) {
                                tr.setNodeMarkup(pos, undefined, {
                                    ...node.attrs,
                                    indentLevel: nextLevel,
                                });
                            }
                            updated = true;
                        }
                    }
                });

                return updated;
            },
        };
    },

    addKeyboardShortcuts() {
        return {
            'Tab': () => this.editor.commands.indent(),
            'Shift-Tab': () => this.editor.commands.outdent(),
        };
    },
});
