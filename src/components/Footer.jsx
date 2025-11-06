export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-white py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-bold mb-4 text-cyan-400">
              GB Automation
            </h3>
            <p className="text-gray-400 mb-4">
              Building the future with agentic systems and vibe coding
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-gray-400 hover:text-cyan-400 transition-colors duration-200">
                  What You Get
                </a>
              </li>
              <li>
                <a href="#contact" className="text-gray-400 hover:text-cyan-400 transition-colors duration-200">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-white">Get in Touch</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="mailto:dev@gbautomation.xyz" className="hover:text-cyan-400 transition-colors duration-200">
                  dev@gbautomation.xyz
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-900 pt-8 text-center text-gray-500 text-sm">
          <p>&copy; {currentYear} GB Automation. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
