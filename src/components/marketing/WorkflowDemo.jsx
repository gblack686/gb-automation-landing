import { useState } from 'react';
import { ArrowDown, ArrowRight, Check, FileText, Layers, MessageSquare, Search } from 'lucide-react';

const workflows = {
  manual: [
    { icon: MessageSquare, label: 'Finish the session', detail: 'Notes across conversations and tools.' },
    { icon: Search, label: 'Reconstruct the context', detail: 'Find the decisions and relevant links.' },
    { icon: FileText, label: 'Write the recap', detail: 'Turn the raw notes into a useful summary.' },
    { icon: Layers, label: 'Move the work forward', detail: 'Copy next steps into the right place.' },
  ],
  automated: [
    { icon: MessageSquare, label: 'Finish the session', detail: 'Start with the context already created.' },
    { icon: Layers, label: 'Connect the context', detail: 'Collect notes, decisions, and references.' },
    { icon: FileText, label: 'Draft the summary', detail: 'Prepare a structured report and next steps.' },
    { icon: Check, label: 'Review and move forward', detail: 'You check the output and choose what happens next.' },
  ],
};

export default function WorkflowDemo() {
  const [mode, setMode] = useState('automated');
  return (
    <div className="workflow-demo">
      <div className="workflow-toolbar">
        <span className="studio-label">SESSION → USEFUL OUTPUT</span>
        <fieldset className="workflow-selector">
          <legend className="studio-sr-only">Compare workflow</legend>
          {[['manual', 'Manual'], ['automated', 'With automation']].map(([value, label]) => <label key={value}>
            <input type="radio" name="workflow" value={value} checked={mode === value} onChange={() => setMode(value)} aria-controls="workflow-result" />
            <span>{label}</span>
          </label>)}
        </fieldset>
      </div>
      <div id="workflow-result" className={`workflow-result workflow-${mode}`} aria-live="polite" aria-atomic="true">
        <div className="workflow-steps">
          {workflows[mode].map((step, i) => {
            const { icon: Icon, label, detail } = step;
            return <div className="workflow-step" key={label}>
            <div className="workflow-step-top"><span className="workflow-icon"><Icon size={21} strokeWidth={1.4} /></span><span className="studio-label">0{i + 1}</span></div>
            <h3>{label}</h3><p>{detail}</p>
            {i < 3 && <><ArrowRight className="workflow-arrow" size={18} /><ArrowDown className="workflow-arrow-mobile" size={18} /></>}
          </div>;
          })}
        </div>
        <div className="workflow-takeaway"><span className="workflow-result-label">{mode === 'automated' ? 'A useful first draft. A human review point.' : 'The work after the work.'}</span><p>{mode === 'automated' ? 'Let the system organize the context, so you can focus on the decisions.' : 'Every handoff depends on someone finding, organizing, and copying the context.'}</p></div>
      </div>
      <p className="workflow-disclaimer">Illustrative workflow. Explore the steps; this example does not run an agent.</p>
    </div>
  );
}
