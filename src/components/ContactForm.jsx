import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';

export default function ContactForm() {
  const [submitStatus, setSubmitStatus] = useState(null);
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const onSubmit = async (data) => {
    try {
      setSubmitStatus('submitting');
      console.log('Form submission:', data);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubmitStatus('success');
      reset();
      setTimeout(() => setSubmitStatus(null), 5000);
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus(null), 5000);
    }
  };

  const visClass = isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5';

  return (
    <section id="contact" ref={sectionRef} className="py-24 px-6 border-t border-[#D6D4C8]/60 bg-[#E6E4D9]/30">
      <div className={`max-w-2xl mx-auto glass-panel p-8 rounded-3xl border border-[#D6D4C8] transition-all duration-700 ${visClass}`}>
        <h2 className="text-3xl font-serif font-medium text-[#191919] tracking-tight mb-4 text-center">
          Let's Build Together
        </h2>
        <p className="text-[#5C5C5C] text-sm text-center mb-12">
          Ready to transform your business with agentic systems? Tell us about your project.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-[#8C8A84] font-bold">
                Name *
              </label>
              <input
                type="text"
                autoComplete="name"
                {...register('name', { required: 'Name is required' })}
                placeholder="Your full name"
                className="w-full px-4 py-3 rounded-lg text-sm input-field"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-[#8C8A84] font-bold">
                Email *
              </label>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-lg text-sm input-field"
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-[#8C8A84] font-bold">
                Company
              </label>
              <input
                type="text"
                autoComplete="organization"
                {...register('company')}
                placeholder="Your company name"
                className="w-full px-4 py-3 rounded-lg text-sm input-field"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-[#8C8A84] font-bold">
                Phone
              </label>
              <input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                {...register('phone')}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 rounded-lg text-sm input-field"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-[#8C8A84] font-bold">
              What are you looking to build? *
            </label>
            <textarea
              rows="4"
              {...register('projectDescription', { required: 'Project description is required' })}
              placeholder="Tell us about your project, goals, and challenges..."
              className="w-full px-4 py-3 rounded-lg text-sm input-field resize-none"
            />
            {errors.projectDescription && (
              <p className="text-sm text-red-600">{errors.projectDescription.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitStatus === 'submitting'}
            className="w-full py-4 mt-8 bg-[#191919] text-[#F3F1E7] font-semibold text-sm uppercase tracking-wider rounded-lg hover:bg-[#333] transition-all shadow-lg hover-mini disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitStatus === 'submitting' ? 'Sending...' : 'Schedule Discovery Call'}
          </button>

          {submitStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
              <p className="font-semibold">Thank you for your interest!</p>
              <p className="text-sm">We'll get back to you within 24 hours.</p>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              <p className="font-semibold">Oops! Something went wrong.</p>
              <p className="text-sm">Please try again or reach out directly.</p>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
