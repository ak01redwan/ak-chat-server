import { useT } from '../i18n';
import { useTheme } from '../context/ThemeContext';
import { MoonIcon, SunIcon } from './icons';

export default function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();
  const t = useT();

  const label = theme === 'dark' ? t.switchToLightTheme : t.switchToDarkTheme;

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
