export default function MediaAssetStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
      .ma-root * { box-sizing: border-box; margin: 0; padding: 0; }
      .ma-root { font-family: 'Syne', sans-serif; background: #0c0c0f; min-height: 100vh; color: #e4e4e7; }
      @keyframes maspin { to { transform: rotate(360deg); } }
      .ma-search, .ma-input, .ma-textarea, .ma-select {
        width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
        border-radius: 9px; color: #e4e4e7; outline: none; box-sizing: border-box;
        transition: border-color 0.2s, background 0.2s;
      }
      .ma-search { padding: 8px 12px 8px 36px; font-family: 'DM Mono', monospace; font-size: 11px; }
      .ma-input, .ma-select { padding: 8px 10px; font-family: 'DM Mono', monospace; font-size: 10px; }
      .ma-textarea { padding: 8px 10px; font-family: 'DM Mono', monospace; font-size: 10px; min-height: 64px; resize: vertical; }
      .ma-search:focus, .ma-input:focus, .ma-textarea:focus, .ma-select:focus { border-color: rgba(124,58,237,0.5); background: rgba(255,255,255,0.055); }
      .ma-search::placeholder, .ma-input::placeholder, .ma-textarea::placeholder { color: rgba(255,255,255,0.2); }
      .ma-label { display: block; font-size: 9px; color: rgba(255,255,255,0.28); font-family: 'DM Mono', monospace; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 5px; }
      .upload-btn {
        display: inline-flex; align-items: center; gap: 7px; padding: 10px 20px;
        background: linear-gradient(135deg, #7c3aed, #4f46e5); border: none;
        border-radius: 11px; font-family: 'Syne', sans-serif; font-size: 12px;
        font-weight: 700; color: white; cursor: pointer; transition: opacity 0.15s;
        letter-spacing: 0.04em;
      }
      .upload-btn:hover:not(:disabled) { opacity: 0.85; }
      .upload-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      .ma-skeleton {
        background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%);
        background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 14px;
      }
      @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      .ma-empty {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 60px 20px; gap: 10px; color: rgba(255,255,255,0.15);
        border: 2px dashed rgba(255,255,255,0.07); border-radius: 16px;
      }
      .ma-main-grid { display: grid; grid-template-columns: 360px 1fr; gap: 20px; align-items: start; }
      .ma-mobile-tabs { display: none; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 16px; }
      .ma-mobile-tab-btn {
        flex: 1; padding: 11px 8px; font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 700;
        border: none; background: none; cursor: pointer; color: rgba(255,255,255,0.35);
        border-bottom: 2px solid transparent; transition: all 0.15s;
        display: flex; align-items: center; justify-content: center; gap: 6px;
      }
      .ma-mobile-tab-btn.active { color: #e4e4e7; border-bottom-color: #7c3aed; }
      @media (max-width: 768px) {
        .ma-mobile-tabs { display: flex; }
        .ma-main-grid { grid-template-columns: 1fr !important; }
        .ma-upload-col { position: static !important; }
        .ma-upload-col.mobile-hidden { display: none !important; }
        .ma-library-col.mobile-hidden { display: none !important; }
        .mobile-hidden { display: none !important; }
        .ma-asset-grid { grid-template-columns: repeat(2, 1fr) !important; }
      }
      @media (max-width: 380px) { .ma-asset-grid { grid-template-columns: 1fr !important; } }
    `}</style>
  )
}
