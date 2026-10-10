import { useState, useEffect } from 'react';

const THEMES = [
  { id: 'emerald', label: 'Emerald Mint', icon: '🌿', color: '#10b981' },
  { id: 'sunset',  label: 'Sunset Coral', icon: '🌅', color: '#f97316' },
  { id: 'violet',  label: 'Electric Violet', icon: '⚡', color: '#a855f7' },
  { id: 'light',   label: 'Daylight Mode', icon: '☀️', color: '#059669' },
];

export default function ThemeSelector({ compact = false }) {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('certiverify-theme') || 'emerald';
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('certiverify-theme', currentTheme);
  }, [currentTheme]);

  const activeThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  return (
    <div className="theme-selector-wrap" style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm theme-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Change Color Theme"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: compact ? '4px 8px' : '6px 12px',
          fontSize: '0.8rem',
        }}
      >
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: activeThemeObj.color,
            display: 'inline-block',
            boxShadow: `0 0 8px ${activeThemeObj.color}`,
          }}
        />
        <span>{activeThemeObj.icon} {!compact && activeThemeObj.label}</span>
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 110 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            className="theme-dropdown"
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 6px)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              padding: '6px',
              zIndex: 120,
              minWidth: '160px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-subtle)', padding: '4px 8px', textTransform: 'uppercase' }}>
              Color Theme
            </div>
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`theme-option ${currentTheme === theme.id ? 'active' : ''}`}
                onClick={() => {
                  setCurrentTheme(theme.id);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: currentTheme === theme.id ? 'var(--color-primary-muted)' : 'transparent',
                  color: currentTheme === theme.id ? 'var(--color-primary-h)' : 'var(--color-text)',
                  fontSize: '0.82rem',
                  fontWeight: currentTheme === theme.id ? 600 : 400,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background 150ms ease',
                }}
              >
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: theme.color,
                    flexShrink: 0,
                  }}
                />
                <span>{theme.icon} {theme.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
