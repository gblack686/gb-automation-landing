import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * CollapsibleSection — themed accordion mirroring the canonical GBAuto
 * collapsible-report <details>/<summary> surface.
 *
 * Presentation only. Keyboard-accessible (native <button> + aria-expanded /
 * aria-controls). Smooth expand/collapse via CSS grid-template-rows (see
 * .gb-collapse* in src/index.css). Chevron rotates on toggle.
 *
 * Props:
 *   - title       (node, required) Newsreader section title.
 *   - eyebrow     (node)  Small number/index or label rendered before the title
 *                         (e.g. "01" or "SECTION"). Aliased by `number`.
 *   - number      (node)  Alias for eyebrow.
 *   - meta        (node)  Right-aligned slot (count, pill, status chip, etc.).
 *   - defaultOpen (bool)  Initial open state. Defaults to FALSE (collapsed).
 *   - className   (string) Extra classes on the outer container.
 *   - children    (node)  Body content.
 */
export default function CollapsibleSection({
  title,
  eyebrow,
  number,
  meta,
  defaultOpen = false,
  className = '',
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const index = eyebrow ?? number;

  return (
    <div className={`gb-collapse ${open ? 'is-open' : ''} ${className}`.trim()}>
      <button
        type="button"
        className="gb-collapse-summary"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
      >
        {index != null && index !== '' ? (
          <span className="gb-collapse-index">{index}</span>
        ) : (
          <span aria-hidden="true" />
        )}
        <span className="gb-collapse-title">{title}</span>
        <span className="gb-collapse-meta">
          {meta}
          <ChevronDown className="gb-chevron h-4 w-4" aria-hidden="true" />
        </span>
      </button>
      <div className="gb-collapse-region" id={bodyId} role="region">
        <div className="gb-collapse-inner">
          <div className="gb-collapse-body">{children}</div>
        </div>
      </div>
    </div>
  );
}
