import React, {memo} from 'react';
import { socialLinks } from '../constants';

const Footer = memo(() => {
  return (
    <footer className='flex justify-center items-center gap-8 p-10'>
      {socialLinks.map((social) => (
        <a
          href={social.url}
          target="_blank"
          rel="noopener noreferrer"
          key={social.name}
          className="transition-transform duration-300 ease-in-out hover:translate-y-[-5px]"
        >
          <img src={social.icon} alt={social.name} className="w-16 h-16" />
        </a>
      ))}
    </footer>
  );
});

export default Footer;