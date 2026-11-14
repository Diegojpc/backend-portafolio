import { memo } from 'react';
import { socialLinks } from '../constants';

const YEAR = new Date().getFullYear();

const Footer = memo(() => (
  <footer className="relative z-10 border-t border-white/[0.06] px-6 sm:px-16 py-8">
    {/* 3 columns on desktop: © on the left, icons truly centred on the page, empty right column */}
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 items-center gap-5 text-[13px] text-muted">
      <span className="order-2 md:order-1 text-center md:text-left">© {YEAR} Diego J. Peña C.</span>
      <ul className="order-1 md:order-2 flex justify-center gap-4">
        {socialLinks.map((social) => (
          <li key={social.name}>
            <a
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.name}
              className="w-14 h-14 flex items-center justify-center rounded-2xl border border-white/10 hover:border-accent/50 hover:-translate-y-0.5 transition-all"
            >
              <img src={social.icon} alt="" className="w-7 h-7 object-contain" />
            </a>
          </li>
        ))}
      </ul>
      <span className="hidden md:block md:order-3" aria-hidden="true" />
    </div>
  </footer>
));

Footer.displayName = 'Footer';

export default Footer;
