import React from "react"

// ─────────────────────────────────────────────────────────────────────────────
// FIRM DETAILS — single source of truth
// ─────────────────────────────────────────────────────────────────────────────
export const FIRM = {
  name:    "OMUYOMA & COMPANY ADVOCATES",
  line1:   "Summit House, 4th Floor, Room 410",
  line2:   "P.O. Box 24083-00100, Nairobi, Kenya",
  tel:     "0741 159 158",
  email:   "omuyomaadvocates@gmail.com",
  mem1:    "Law Society of Kenya",
  mem2:    "East African Law Society",
  tagline: "Advocates of the High Court of Kenya",
}

// ─────────────────────────────────────────────────────────────────────────────
// SHIELD O LOGO — SVG
// ─────────────────────────────────────────────────────────────────────────────
export function ShieldLogo({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" fill="none">
      <defs>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#0f172a"/>
          <stop offset="50%"  stopColor="#1E3A8A"/>
          <stop offset="100%" stopColor="#1d4ed8"/>
        </linearGradient>
        <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#60A5FA"/>
          <stop offset="50%"  stopColor="#0EA5E9"/>
          <stop offset="100%" stopColor="#6366F1"/>
        </linearGradient>
        <linearGradient id="innerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#EFF6FF"/>
          <stop offset="100%" stopColor="#DBEAFE"/>
        </linearGradient>
      </defs>

      {/* Outer hexagonal shield */}
      <path
        d="M45 4 L78 18 L78 50 Q78 70 45 86 Q12 70 12 50 L12 18 Z"
        fill="url(#shieldGrad)"
        stroke="url(#borderGrad)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Inner shield ring */}
      <path
        d="M45 11 L72 23 L72 50 Q72 66 45 80 Q18 66 18 50 L18 23 Z"
        fill="none"
        stroke="#3B82F6"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.5"
      />

      {/* Inner light shield face */}
      <path
        d="M45 16 L68 27 L68 50 Q68 63 45 75 Q22 63 22 50 L22 27 Z"
        fill="url(#innerGrad)"
        opacity="0.12"
      />

      {/* Teal accent dots at shield corners */}
      <circle cx="45" cy="4"  r="2.5" fill="#0EA5E9"/>
      <circle cx="78" cy="18" r="2"   fill="#6366F1"/>
      <circle cx="78" cy="50" r="2"   fill="#6366F1"/>
      <circle cx="45" cy="86" r="2.5" fill="#0EA5E9"/>
      <circle cx="12" cy="50" r="2"   fill="#6366F1"/>
      <circle cx="12" cy="18" r="2"   fill="#6366F1"/>

      {/* O Monogram */}
      <text
        x="45" y="57"
        textAnchor="middle"
        fontSize="32"
        fontFamily="Georgia, serif"
        fontWeight="400"
        fill="#ffffff"
        letterSpacing="0"
      >O</text>

      {/* Teal inner O ring */}
      <circle cx="45" cy="45" r="17" fill="none" stroke="#0EA5E9" strokeWidth="0.8" opacity="0.4"/>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL LETTERHEAD COMPONENT
// Used inside every invoice and fee note print view
// ─────────────────────────────────────────────────────────────────────────────
interface LetterheadProps {
  docRef?:   string
  docDate?:  string
  docTitle?: string
  printMode?: boolean
}

export function FirmLetterhead({ docRef, docDate, docTitle, printMode = false }: LetterheadProps) {
  const bg      = printMode ? "#fff"    : "#0c1527"
  const textPri = printMode ? "#0f172a" : "#e8eaf0"
  const textSec = printMode ? "#475569" : "#6b7fa3"
  const textAcc = printMode ? "#1E3A8A" : "#60A5FA"
  const borderC = printMode ? "#e2e8f0" : "rgba(255,255,255,0.08)"
  const bandBg  = printMode ? "#1E3A8A" : "#0f172a"
  const sidebarBg = printMode ? "#f0f4ff" : "rgba(65,105,225,0.08)"

  return (
    <div style={{ fontFamily: "Georgia, serif", position: "relative", overflow: "hidden" }}>

      {/* Ghost watermark crest */}
      <div style={{
        position: "absolute", right: -20, top: -10,
        opacity: printMode ? 0.04 : 0.03, pointerEvents: "none",
      }}>
        <ShieldLogo size={200} />
      </div>

      {/* ── Main header ── */}
      <div style={{
        display: "flex", alignItems: "stretch",
        background: bg, borderBottom: `1px solid ${borderC}`,
      }}>

        {/* Left accent stripe */}
        <div style={{
          width: 5, flexShrink: 0,
          background: "linear-gradient(180deg,#1E3A8A 0%,#0EA5E9 50%,#6366F1 100%)",
        }} />

        {/* Logo + Firm name block */}
        <div style={{
          background: bandBg, padding: "18px 22px",
          display: "flex", alignItems: "center", gap: 14,
          flexShrink: 0, minWidth: 260,
        }}>
          <ShieldLogo size={64} />
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "#0EA5E9",
              fontFamily: "sans-serif", marginBottom: 5,
            }}>
              {FIRM.tagline}
            </div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "#ffffff", lineHeight: 1.15 }}>
              Omuyoma <span style={{ color: "#60A5FA" }}>&amp;</span> Company
            </div>
            <div style={{
              fontSize: 11, letterSpacing: "0.2em", color: "#93C5FD",
              fontFamily: "sans-serif", marginTop: 3,
            }}>
              ADVOCATES
            </div>
          </div>
        </div>

        {/* Center: doc title if provided */}
        {docTitle && (
          <div style={{
            flex: 1, display: "flex", alignItems: "center",
            justifyContent: "center", padding: "0 20px",
            background: sidebarBg,
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
              textTransform: "uppercase", color: textAcc, fontFamily: "sans-serif",
            }}>
              {docTitle}
            </div>
          </div>
        )}

        {/* Right: contact details */}
        <div style={{
          background: sidebarBg, borderLeft: `1px solid ${borderC}`,
          padding: "16px 20px", textAlign: "right",
          fontSize: 10, color: textSec, fontFamily: "sans-serif",
          lineHeight: 1.95, flexShrink: 0, minWidth: 210,
          display: "flex", flexDirection: "column", justifyContent: "center",
        }}>
          <div style={{ fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: textAcc, marginBottom: 4 }}>
            CHAMBERS
          </div>
          <div>{FIRM.line1}</div>
          <div>{FIRM.line2}</div>
          <div>
            <span style={{ color: textAcc, fontWeight: 600 }}>T</span> {FIRM.tel}
          </div>
          <div>
            <span style={{ color: textAcc, fontWeight: 600 }}>E</span> {FIRM.email}
          </div>
        </div>
      </div>

      {/* ── Tri-color accent rule ── */}
      <div style={{ display: "flex", height: 3 }}>
        <div style={{ flex: 2, background: "#1E3A8A" }} />
        <div style={{ flex: 2, background: "#0EA5E9" }} />
        <div style={{ flex: 1, background: "#6366F1" }} />
        <div style={{ flex: 1, background: "#D97706" }} />
      </div>

      {/* ── Membership bar ── */}
      <div style={{
        background: printMode ? "#f8faff" : "rgba(30,58,138,0.2)",
        borderBottom: `1px solid ${borderC}`,
        padding: "5px 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 9, color: textSec, letterSpacing: "0.1em", fontFamily: "sans-serif" }}>
          MEMBER: {FIRM.mem1.toUpperCase()}
        </span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#1E3A8A" }} />
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#0EA5E9" }} />
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#6366F1" }} />
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#D97706" }} />
        </div>
        <span style={{ fontSize: 9, color: textSec, letterSpacing: "0.1em", fontFamily: "sans-serif" }}>
          {FIRM.mem2.toUpperCase()}
        </span>
      </div>

      {/* ── Doc reference strip ── */}
      {(docRef || docDate) && (
        <div style={{
          display: "flex", gap: 24, padding: "8px 24px",
          borderBottom: `1px solid ${borderC}`,
          background: bg,
          fontSize: 11, fontFamily: "sans-serif", color: textSec,
        }}>
          {docRef && (
            <span>
              <span style={{ color: textAcc, fontWeight: 700 }}>Ref: </span>
              {docRef}
            </span>
          )}
          {docDate && (
            <span>
              <span style={{ color: textAcc, fontWeight: 700 }}>Date: </span>
              {new Date(docDate + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 10, letterSpacing: "0.06em" }}>
            WITHOUT PREJUDICE
          </span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT FOOTER — appears at bottom of every printed document
// ─────────────────────────────────────────────────────────────────────────────
export function FirmFooter({ printMode = false }: { printMode?: boolean }) {
  const textSec = printMode ? "#64748b" : "#6b7fa3"
  const borderC = printMode ? "#e2e8f0" : "rgba(255,255,255,0.08)"
  const textAcc = printMode ? "#1E3A8A" : "#60A5FA"

  return (
    <div style={{ borderTop: `1px solid ${borderC}`, marginTop: 32 }}>
      {/* Tri-color footer rule */}
      <div style={{ display: "flex", height: 2, marginBottom: 10 }}>
        <div style={{ flex: 2, background: "#1E3A8A" }} />
        <div style={{ flex: 2, background: "#0EA5E9" }} />
        <div style={{ flex: 1, background: "#6366F1" }} />
        <div style={{ flex: 1, background: "#D97706" }} />
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 4px", fontSize: 10, color: textSec, fontFamily: "sans-serif",
      }}>
        <span>{FIRM.name}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ShieldLogo size={18} />
        </div>
        <span style={{ color: textAcc }}>{FIRM.tel} · {FIRM.email}</span>
      </div>
    </div>
  )
}
