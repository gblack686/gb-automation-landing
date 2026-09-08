import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowUpRight, Check } from 'lucide-react';
import { insertContactSubmission } from '../../lib/supabaseOps';

export default function ProjectBrief() {
  const [status, setStatus] = useState('idle');
  const pending = useRef(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const submit = async (data) => {
    if (pending.current) return;
    pending.current = true;
    setStatus('pending');
    try {
      await insertContactSubmission({
        name: data.name.trim(), email: data.email.trim(), company: data.company?.trim() || null,
        phone: data.phone?.trim() || null, project_description: data.projectDescription.trim(),
      });
      setStatus('success');
      reset();
    } catch {
      setStatus('error');
    } finally {
      pending.current = false;
    }
  };

  const textRequired = (label) => ({ required: `${label} is required.`, validate: (value) => !!value.trim() || `${label} is required.` });
  const fields = [
    { name: 'name', label: 'Your name', complete: 'name', required: true },
    { name: 'email', label: 'Email address', complete: 'email', type: 'email', required: true },
    { name: 'company', label: 'Company', complete: 'organization' },
    { name: 'phone', label: 'Phone', complete: 'tel', type: 'tel' },
  ];

  return (
    <div className="project-brief" id="project-brief">
      <div className="brief-heading"><h3>Prefer to write it down?</h3><p>Send a short brief. Start with the work you want to improve.</p></div>
      <form onSubmit={handleSubmit(submit)} noValidate aria-label="Send a project brief" aria-busy={status === 'pending'}>
        <fieldset disabled={status === 'pending'}>
          <legend className="studio-sr-only">Project details</legend>
          <div className="brief-fields">
            {fields.map(({ name, label, complete, type = 'text', required }) => <div className="brief-field" key={name}>
              <label htmlFor={`brief-${name}`}>{label} <span>{required ? '*' : '(optional)'}</span></label>
              <input id={`brief-${name}`} type={type} autoComplete={complete} aria-required={required || undefined} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `brief-${name}-error` : undefined}
                {...register(name, { ...(required ? textRequired(label) : {}), ...(name === 'email' ? { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address.' } } : {}) })} />
              {errors[name] && <p className="brief-field-error" id={`brief-${name}-error`}>{errors[name].message}</p>}
            </div>)}
          </div>
          <div className="brief-field brief-description"><label htmlFor="brief-project">What would you like to improve? <span>*</span></label>
            <textarea id="brief-project" rows="3" aria-required="true" aria-invalid={!!errors.projectDescription} aria-describedby={errors.projectDescription ? 'brief-project-error' : undefined} {...register('projectDescription', textRequired('Project description'))} />
            {errors.projectDescription && <p className="brief-field-error" id="brief-project-error">{errors.projectDescription.message}</p>}
          </div>
          <div className="brief-submit-row"><span>Required fields marked *</span><button type="submit" className="studio-button studio-button-dark" disabled={status === 'pending'}>{status === 'pending' ? 'Sending your brief…' : status === 'error' ? 'Try sending again' : 'Send project brief'}<ArrowUpRight size={18} /></button></div>
        </fieldset>
        <div className="brief-status" role="status" aria-live="polite" aria-atomic="true">
          {status === 'success' && <p className="brief-success"><Check size={19} /> Your brief has been sent. Thanks for sharing what you’re working on.</p>}
          {status === 'error' && <p className="brief-error">Your brief couldn’t be sent. Your details are still here—please try again, or use the discovery call link.</p>}
        </div>
      </form>
    </div>
  );
}
