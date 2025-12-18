import { useEffect, useRef } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

export default function PortfolioModal({ isOpen, onClose, item }) {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      const previouslyFocused = document.activeElement;
      closeButtonRef.current.focus();

      return () => {
        if (previouslyFocused) {
          previouslyFocused.focus();
        }
      };
    }
  }, [isOpen]);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  // Click outside to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !item) return null;

  const IconComponent = item.Icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 animate-fadeIn"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        background: 'rgba(25, 25, 25, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
    >
      {/* Modal Card */}
      <div
        ref={modalRef}
        className="glass-panel relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#D6D4C8] shadow-2xl animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur border border-[#D6D4C8] flex items-center justify-center hover:bg-[#191919] hover:text-[#F3F1E7] transition-all"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[90vh] scroll-container">
          {/* Header with Image */}
          <div className="h-64 bg-[#F3F1E7] relative overflow-hidden flex items-center justify-center border-b border-[#D6D4C8]">
            <img
              src={item.image}
              alt={`${item.name} illustration`}
              className="absolute inset-0 w-full h-full object-cover grayscale opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#E6E4D9] to-transparent opacity-70"></div>
            <div className="relative z-10 px-4 py-2 bg-white/90 backdrop-blur border border-[#D6D4C8] rounded-full text-xs uppercase tracking-widest font-bold text-[#191919]">
              Unit: {item.unit}
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Title Section */}
            <div className="mb-6 animate-slideUp" style={{ animationDelay: '50ms' }}>
              <div className="flex items-start justify-between mb-2">
                <h2 id="modal-title" className="text-4xl font-serif font-medium text-[#191919] tracking-tight">
                  {item.name}
                </h2>
                <div className="w-12 h-12 rounded-full border-2 border-[#D97757] flex items-center justify-center text-[#D97757]">
                  <IconComponent className="w-6 h-6" />
                </div>
              </div>
              <p className="text-sm text-[#8C8A84] uppercase tracking-wide font-medium mb-1">{item.role}</p>
              <p className="text-lg text-[#D97757] font-medium">{item.tagline}</p>
            </div>

            {/* Description */}
            <div className="mb-8 animate-slideUp" style={{ animationDelay: '100ms' }}>
              <p className="text-base text-[#5C5C5C] leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Features Grid */}
            <div className="mb-8 animate-slideUp" style={{ animationDelay: '150ms' }}>
              <h3 className="text-xs uppercase font-bold text-[#8C8A84] tracking-wider mb-4">Key Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {item.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-[#F3F1E7]/50 rounded-lg border border-[#D6D4C8]">
                    <CheckCircle2 className="w-4 h-4 text-[#D97757] flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#191919]">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Capabilities Tags */}
            <div className="mb-8 animate-slideUp" style={{ animationDelay: '200ms' }}>
              <h3 className="text-xs uppercase font-bold text-[#8C8A84] tracking-wider mb-4">Capabilities</h3>
              <div className="flex flex-wrap gap-2">
                {item.capabilities.map((cap, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-[#F3F1E7] border border-[#D6D4C8] rounded-full text-sm text-[#5C5C5C] font-medium"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            {/* Technologies */}
            <div className="mb-8 animate-slideUp" style={{ animationDelay: '250ms' }}>
              <h3 className="text-xs uppercase font-bold text-[#8C8A84] tracking-wider mb-4">Technologies</h3>
              <div className="flex flex-wrap gap-2">
                {item.technologies.map((tech, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-[#191919] text-[#F3F1E7] rounded text-xs font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Use Cases */}
            <div className="mb-8 animate-slideUp" style={{ animationDelay: '300ms' }}>
              <h3 className="text-xs uppercase font-bold text-[#8C8A84] tracking-wider mb-4">Use Cases</h3>
              <ul className="space-y-2">
                {item.useCases.map((useCase, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-[#5C5C5C]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D97757] flex-shrink-0 mt-1.5"></span>
                    <span>{useCase}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Detailed Info Section */}
            {item.detailedInfo && (
              <div className="border-t border-[#D6D4C8] pt-8 animate-slideUp" style={{ animationDelay: '350ms' }}>
                <h3 className="text-2xl font-serif font-medium text-[#191919] mb-6">Technical Details</h3>

                {/* Architecture */}
                <div className="mb-6">
                  <h4 className="text-xs uppercase font-bold text-[#8C8A84] tracking-wider mb-2">Architecture</h4>
                  <p className="text-sm text-[#5C5C5C] leading-relaxed">{item.detailedInfo.architecture}</p>
                </div>

                {/* Integrations */}
                <div className="mb-6">
                  <h4 className="text-xs uppercase font-bold text-[#8C8A84] tracking-wider mb-2">Integrations</h4>
                  <div className="flex flex-wrap gap-2">
                    {item.detailedInfo.integrations.map((integration, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-white border border-[#D6D4C8] rounded text-xs text-[#5C5C5C]"
                      >
                        {integration}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Benefits */}
                <div className="mb-6">
                  <h4 className="text-xs uppercase font-bold text-[#8C8A84] tracking-wider mb-3">Benefits</h4>
                  <ul className="space-y-2">
                    {item.detailedInfo.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-[#5C5C5C]">
                        <CheckCircle2 className="w-4 h-4 text-[#D97757] flex-shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Deployment */}
                <div className="mb-6">
                  <h4 className="text-xs uppercase font-bold text-[#8C8A84] tracking-wider mb-2">Deployment</h4>
                  <p className="text-sm text-[#5C5C5C] leading-relaxed">{item.detailedInfo.deployment}</p>
                </div>
              </div>
            )}

            {/* CTA Footer */}
            <div className="border-t border-[#D6D4C8] pt-6 mt-8 animate-slideUp" style={{ animationDelay: '400ms' }}>
              <button
                onClick={() => {
                  const contactSection = document.querySelector('#contact');
                  if (contactSection) {
                    onClose();
                    setTimeout(() => {
                      contactSection.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                  }
                }}
                className="w-full md:w-auto px-8 py-3 bg-[#191919] text-[#F3F1E7] rounded-lg font-medium hover:bg-[#D97757] transition-all hover:-translate-y-1 shadow-lg"
              >
                Get Started with {item.name}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-slideUp {
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fadeIn,
          .animate-scaleIn,
          .animate-slideUp {
            animation-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}
