import { useState, useRef, useEffect } from 'react';
import { BLOCK_CATEGORIES, BLOCK_TYPE_META } from '../lib/blockTypes.js';

export function BlockLibrary({ onAddBlock, onDragStart }) {
    const [search, setSearch] = useState('');
    const [collapsed, setCollapsed] = useState({});

    const toggleCategory = (label) => {
        setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const filteredCategories = BLOCK_CATEGORIES.map(cat => ({
        ...cat,
        types: cat.types.filter(t => {
            const meta = BLOCK_TYPE_META[t];
            return !search || meta.label.toLowerCase().includes(search.toLowerCase());
        }),
    })).filter(cat => cat.types.length > 0);

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2>Biblioteca de Blocos</h2>
                <div className="search-wrapper">
                    <svg className="search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        className="search-input"
                        placeholder="Buscar blocos..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="sidebar-content">
                {filteredCategories.map(cat => (
                    <div className="block-category" key={cat.label}>
                        <div
                            className="block-category-header"
                            onClick={() => toggleCategory(cat.label)}
                        >
                            <svg
                                width="10"
                                height="10"
                                viewBox="0 0 10 10"
                                style={{
                                    transform: collapsed[cat.label] ? 'rotate(-90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s',
                                }}
                            >
                                <path d="M1 3l4 4 4-4" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            {cat.label}
                        </div>

                        {!collapsed[cat.label] && (
                            <div className="block-items">
                                {cat.types.map(type => {
                                    const meta = BLOCK_TYPE_META[type];
                                    return (
                                        <div
                                            key={type}
                                            className="block-item"
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('blockType', type);
                                                if (onDragStart) onDragStart(type);
                                            }}
                                            onClick={() => onAddBlock(type)}
                                            title={`Clique ou arraste para adicionar: ${meta.label}`}
                                        >
                                            <div className={`block-item-icon ${meta.iconClass}`}>
                                                {meta.icon}
                                            </div>
                                            <span className="block-item-label">{meta.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </aside>
    );
}
