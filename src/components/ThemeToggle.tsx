import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { MoonIcon, SunIcon } from './icons';

export default function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();
  const [label, setLabel] = useState<string>();

  useEffect(() => {
    setLabel(theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }, [theme]);

  return (
    <button
      type="button"
      className="btn btn--icon"
      onClick={cycleTheme}
      aria-label={label}
      title={label}
    >
      {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
    </button>
  );
}
