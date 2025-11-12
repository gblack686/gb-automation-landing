import { useState } from 'react';
import { useForm } from 'react-hook-form';

export default function ContactForm() {
  const [submitStatus, setSubmitStatus] = useState(null);
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const onSubmit = async (data) => {
    try {
      setSubmitStatus('submitting');

      // For now, we'll just log the data and simulate a successful submission
      // Later we'll connect this to AWS Amplify Data/API
      console.log('Form submission:', data);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSubmitStatus('success');
      reset();

      // Reset success message after 5 seconds
      setTimeout(() => setSubmitStatus(null), 5000);
    } catch (error) {
      console.error('Submission error:', error);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus(null), 5000);
    }
  };

  return (
    <section id="contact" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gray-950">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 sm:mb-4">Let's Build Together</h2>
          <p className="text-lg sm:text-xl text-gray-400">
            Ready to transform your business with agentic systems? Tell us about your project.
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-white mb-2">
                Name *
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                {...register('name', { required: 'Name is required' })}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-200 text-base min-h-[48px]"
                placeholder="Your full name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                Email *
              </label>
              <input
                id="email"
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
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-200 text-base min-h-[48px]"
                placeholder="you@company.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Company */}
            <div>
              <label htmlFor="company" className="block text-sm font-semibold text-white mb-2">
                Company
              </label>
              <input
                id="company"
                type="text"
                autoComplete="organization"
                {...register('company')}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-200 text-base min-h-[48px]"
                placeholder="Your company name"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-white mb-2">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                {...register('phone')}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-200 text-base min-h-[48px]"
                placeholder="(555) 123-4567"
              />
            </div>

            {/* Project Description */}
            <div>
              <label htmlFor="projectDescription" className="block text-sm font-semibold text-white mb-2">
                What are you looking to build? *
              </label>
              <textarea
                id="projectDescription"
                {...register('projectDescription', { required: 'Project description is required' })}
                rows="4"
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-200 text-base"
                placeholder="Tell us about your project, goals, and challenges..."
              />
              {errors.projectDescription && (
                <p className="mt-1 text-sm text-red-400">{errors.projectDescription.message}</p>
              )}
            </div>

            {/* Additional Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-semibold text-white mb-2">
                Additional Information
              </label>
              <textarea
                id="message"
                {...register('message')}
                rows="3"
                className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-200 text-base"
                placeholder="Any other details you'd like to share..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitStatus === 'submitting'}
              className="w-full bg-cyan-400 text-black py-4 px-6 sm:px-8 rounded-lg text-base sm:text-lg font-semibold hover:bg-cyan-300 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px] active:scale-95 touch-manipulation"
              aria-label="Submit contact form"
            >
              {submitStatus === 'submitting' ? 'Sending...' : 'Schedule Discovery Call'}
            </button>

            {/* Status Messages */}
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
      </div>
    </section>
  );
}
