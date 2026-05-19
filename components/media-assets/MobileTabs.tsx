import { Image as ImageIcon, Upload } from 'lucide-react'
import type { MobileTab } from './types'

export default function MobileTabs({ active, onChange, libraryCount, queueCount }: {
  active: MobileTab
  onChange: (tab: MobileTab) => void
  libraryCount: number
  queueCount: number
}) {
  return (
    <>
      <style>{`
        .ma-mobile-tabs {
          display: none;
        }
        @media (max-width: 768px) {
          .ma-mobile-tabs {
            display: flex;
            gap: 6px;
            margin-bottom: 16px;
            padding: 5px;
            background: rgba(255,255,255,0.55);
            border: 1px solid rgba(0,0,0,0.07);
            border-radius: 14px;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 4px rgba(0,0,0,0.05);
          }
        }

        .ma-mobile-tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 9px 12px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: rgba(0,0,0,0.4);
          cursor: pointer;
          transition: all 0.15s;
        }
        .ma-mobile-tab-btn:hover {
          background: rgba(255,255,255,0.65);
          color: rgba(0,0,0,0.65);
        }
        .ma-mobile-tab-btn.active {
          background: rgba(255,255,255,0.88);
          border-color: rgba(124,85,246,0.22);
          color: #4c2db8;
          box-shadow: inset 0 1px 0 rgba(255,255,255,1), 0 2px 8px rgba(124,85,246,0.1);
        }

        .ma-tab-badge {
          border-radius: 999px;
          padding: 1px 7px;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .ma-tab-badge-default {
          background: rgba(124,85,246,0.1);
          border: 1px solid rgba(124,85,246,0.18);
          color: rgba(124,85,246,0.7);
        }
        .ma-tab-badge-active {
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: white;
          box-shadow: 0 2px 6px rgba(99,102,241,0.3);
        }
      `}</style>

      <div className="ma-mobile-tabs">
        <button
          className={`ma-mobile-tab-btn ${active === 'library' ? 'active' : ''}`}
          onClick={() => onChange('library')}
        >
          <ImageIcon style={{ width: 13, height: 13 }} />
          Library
          <span className={`ma-tab-badge ma-tab-badge-default`}>{libraryCount}</span>
        </button>

        <button
          className={`ma-mobile-tab-btn ${active === 'upload' ? 'active' : ''}`}
          onClick={() => onChange('upload')}
        >
          <Upload style={{ width: 13, height: 13 }} />
          Upload
          {queueCount > 0 && (
            <span className="ma-tab-badge ma-tab-badge-active">{queueCount}</span>
          )}
        </button>
      </div>
    </>
  )
}