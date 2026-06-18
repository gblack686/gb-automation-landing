/**
 * OpsPageShell + SectionHeader — themed page frame primitives for /ops pages.
 *
 * The /ops route frame (cream bg, OpsHeader, centered max-w-7xl <main>) lives in
 * src/ops/routes.jsx; the ambient gradient layer is also mounted there so every
 * page inherits it. These helpers give individual pages a consistent vertical
 * rhythm and a canonical section header. Presentation only.
 */

/**
 * SectionHeader — number/eyebrow + Newsreader title + trailing rule, with an
 * optional right-aligned meta slot. Mirrors .sec-head from the AI-resume chrome.
 *
 * Props:
 *   - number  (node)  Small mono index/eyebrow (e.g. "01" or "OVERVIEW").
 *   - title   (node, required)
 *   - meta    (node)  Right-aligned slot (pill, chip, action) before the rule.
 *   - className (string)
 */
export function SectionHeader({ number, title, meta, className = '' }) {
  return (
    <div className={`sec-head ${className}`.trim()}>
      {number != null && number !== '' ? <span className="num">{number}</span> : null}
      <h2>{title}</h2>
      <span className="rule" />
      {meta ? <div className="shrink-0">{meta}</div> : null}
    </div>
  );
}

/**
 * OpsPageShell — vertical-rhythm wrapper for a page's body. Optionally renders a
 * leading SectionHeader. Drop page content as children. Render inside the /ops
 * <main> provided by routes.jsx (do not add another header/nav).
 *
 * Props:
 *   - eyebrow / number (node)  Passed to the leading SectionHeader.
 *   - title    (node)  When set, a SectionHeader is rendered first.
 *   - meta     (node)  Right-aligned slot for the leading SectionHeader.
 *   - className (string)
 *   - children (node)
 */
export default function OpsPageShell({
  eyebrow,
  number,
  title,
  meta,
  className = '',
  children,
}) {
  return (
    <div className={`space-y-10 ${className}`.trim()}>
      {title ? <SectionHeader number={number ?? eyebrow} title={title} meta={meta} /> : null}
      {children}
    </div>
  );
}
