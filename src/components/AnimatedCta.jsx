import { ArrowRight } from 'lucide-react';

export default function AnimatedCta({ children, href, className = '', ...props }) {
  const Element = href ? 'a' : 'button';
  return (
    <Element {...props} {...(href ? { href } : {})} className={`animated-cta ${className}`}>
      <span className="animated-cta-shimmer" aria-hidden="true" />
      <span className="animated-cta-label">{children}<ArrowRight aria-hidden="true" /></span>
    </Element>
  );
}
