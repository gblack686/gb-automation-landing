export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 border-t border-[#D6D4C8]/60 bg-[#F3F1E7] text-center">
      <div className="flex items-center justify-center gap-2 mb-6 hover-mini cursor-default">
        <div className="w-4 h-4 bg-[#D97757]/20 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-[#D97757] rounded-full"></div>
        </div>
        <span className="text-xs font-serif font-semibold text-[#191919] tracking-widest uppercase">
          GB Automation
        </span>
      </div>
      <div className="flex flex-col gap-4 mb-8">
        <a href="mailto:dev@gbautomation.xyz" className="text-sm text-[#5C5C5C] hover:text-[#D97757] transition-colors">
          dev@gbautomation.xyz
        </a>
      </div>
      <p className="text-[10px] text-[#8C8A84] uppercase tracking-wider">
        &copy; {currentYear} GB Automation. All rights reserved.
      </p>
      <p className="text-[10px] text-[#8C8A84] mt-2">
        Powered by ElevenLabs Agents
      </p>
    </footer>
  );
}
