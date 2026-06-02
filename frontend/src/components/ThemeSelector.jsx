import { useState, useEffect, useRef } from 'react';
import themesData from '../lib/themes.json';

// Injecting themes data into global CSS
const applyTheme = (themeKey) => {
    const theme = themesData[themeKey];
    if (!theme) return;
    
    const root = document.documentElement;
    const colors = theme.colors;
    
    root.style.setProperty('--bg-primary', colors.window_bg);
    root.style.setProperty('--bg-secondary', colors.editor_bg);
    root.style.setProperty('--bg-surface', colors.window_bg);
    root.style.setProperty('--bg-elevated', colors.editor_bg);
    root.style.setProperty('--bg-hover', colors.selection_bg);
    
    root.style.setProperty('--text-primary', colors.foreground);
    root.style.setProperty('--text-secondary', colors.muted_foreground);
    root.style.setProperty('--text-muted', colors.muted_foreground);
    root.style.setProperty('--text-accent', colors.accent);
    
    root.style.setProperty('--accent-indigo', colors.accent);
    root.style.setProperty('--accent-violet', colors.accent_hover);
    
    root.style.setProperty('--border-subtle', colors.hr_color);
    root.style.setProperty('--border-default', colors.border);
    root.style.setProperty('--border-accent', colors.accent);
};

export const ThemeSelector = () => {
    const [open, setOpen] = useState(false);
    const [currentTheme, setCurrentTheme] = useState(() => {
        return localStorage.getItem('blocktex-ui-theme') || 'adwaita_dark';
    });
    const dropdownRef = useRef(null);

    useEffect(() => {
        applyTheme(currentTheme);
        localStorage.setItem('blocktex-ui-theme', currentTheme);
    }, [currentTheme]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
                className="btn btn-icon btn-ghost" 
                onClick={() => setOpen(!open)}
                title="Alterar Tema Visual"
            >
                ☀️
            </button>
            
            {open && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-md)',
                    padding: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000,
                    minWidth: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    <div style={{ 
                        fontSize: '11px', 
                        fontWeight: 'bold', 
                        color: 'var(--text-muted)',
                        padding: '4px 8px',
                        textTransform: 'uppercase'
                    }}>
                        Temas Visuais
                    </div>
                    {Object.entries(themesData).map(([key, theme]) => (
                        <button
                            key={key}
                            onClick={() => {
                                setCurrentTheme(key);
                                setOpen(false);
                            }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                padding: '8px',
                                background: currentTheme === key ? 'var(--bg-hover)' : 'transparent',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                textAlign: 'left'
                            }}
                        >
                            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{theme.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{theme.meta.variant}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
