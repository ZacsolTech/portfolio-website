/**
 * Blocking inline script — sets data-theme before paint (no FOUC).
 * Mirrors design/index.html + design/theme.js preference rules.
 */
export function ThemeScript() {
  const code = `(function(){try{var t=localStorage.getItem('zacsol-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme:light)').matches?'light':'dark';document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: required FOUC-prevention bootstrap
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
