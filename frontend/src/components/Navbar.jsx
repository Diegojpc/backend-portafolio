import React, { useState, memo } from 'react';
import { Link } from 'react-router-dom';


import { styles } from '../styles';
import { getNavLinks } from '../constants';
import { logo, menu, close } from '../assets';
import { LocalAudioPlayer } from './canvas';
import { useLanguage } from '../context/LanguageContext';

const Navbar = memo(({ setAudioElement }) => {
  const [active, setActive] = useState('');
  const [toggle, setToggle] = useState(false);
  const { t, language, toggleLanguage } = useLanguage();
  const navLinks = getNavLinks(t);
  
  return (
    <nav
      className={`${styles.paddingX} w-full flex items-center py-5 fixed top-0 z-20 bg-navbar-gradient`}
    >
      <div className="w-full flex justify-between items-center max-w-7xl mx-auto -mt-2">
        <Link
          to="/"
          className="flex items-center gap-2"
          onClick={() => {
            setActive("");
            window.scrollTo(0, 0)
          }}
        >
          <img src={logo} alt="logo" className="w-9 h-9 object-contain" />
          <p className='text-white text-[18px] font-bold cursor-pointer md:block hidden'>Diego J. Peña C.</p>
        </Link>

        <div className="flex min-w-0 flex-1 justify-center items-center mt-[-10px] mx-2 sm:mx-6 overflow-hidden">
          <LocalAudioPlayer setAudioElement={setAudioElement} />
        </div>

        <div className="hidden sm:flex flex-row items-center gap-10">
          <ul className='list-none flex flex-row gap-10'>
            {navLinks.map((link) => (
              <li
                key={link.id}
                className={`${
                  active === link.title
                  ? "text-secondary"
                  : "text-white"
                } hover:text-secondary text-[18px] font-medium cursor-pointer`}
                onClick={() => setActive(link.title)}
              >
                <a href={`#${link.id}`}>{link.title}</a>
              </li>
            ))}
          </ul>
          
          <button 
            onClick={toggleLanguage}
            className="flex items-center justify-center font-bold text-[14px] px-2 py-1 border border-white/20 rounded hover:bg-white/10 transition-colors text-white"
            title="Toggle Language"
          >
            {language === 'en' ? 'ES' : 'EN'}
          </button>
        </div>
        <div className='sm:hidden flex flex-1 justify-end items-center gap-4'>
          <img
            src={toggle ? close : menu}
            alt="menu"
            className='w-[28px] h-[28px] object-contain cursor-pointer'
            onClick={() => setToggle(!toggle)}
          />
          <div className={`${!toggle ? 'hidden' : 'flex' } p-6 bg-black from-black to-secondary absolute top-20 right-0 mx-4 my-2 min-w-[140px] z-10 rounded-xl`}>
            <ul className='list-none flex justify-end items-start flex-col gap-4'>
              {navLinks.map((link) => (
                <li
                  key={link.id}
                  className={`${
                    active === link.title
                    ? "text-secondary"
                    : "text-white"
                  } hover:text-secondary font-poppins font-medium cursor-pointer text-[16px]`}
                  onClick={() => {
                    setToggle(!toggle)
                    setActive(link.title)
                  }}
                >
                  <a href={`#${link.id}`}>{link.title}</a>
                </li>
              ))}
              <li className="w-full mt-2">
                <button 
                  onClick={() => {
                    toggleLanguage();
                    setToggle(false);
                  }}
                  className="flex items-center justify-center font-bold text-[14px] px-4 py-2 border border-white/20 rounded hover:bg-white/10 transition-colors text-white w-full"
                  title="Toggle Language"
                >
                  {language === 'en' ? 'ESPAÑOL' : 'ENGLISH'}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  )
});

export default Navbar;