import { useState } from 'react';
import { useInstall } from '../pwa.js';
import { Confirm } from './ui.jsx';

// "Install app": uses the browser's install prompt where there is one, and explains
// Share → Add to Home Screen on iPhone and iPad. Renders nothing once installed or where installing isn't possible.
export function InstallButton({ className = 'link-btn', children = 'Install the app', style }) {
  const { mode, install } = useInstall();
  const [help, setHelp] = useState(false);
  if (mode !== 'prompt' && mode !== 'ios') return null;

  return (
    <>
      <button type="button" className={className} style={style} onClick={() => (mode === 'prompt' ? install() : setHelp(true))}>
        {children}
      </button>
      {help && (
        <Confirm
          title="Add alignment to your Home Screen"
          message="In Safari, tap the Share button (the square with an arrow), then choose “Add to Home Screen”. alignment then opens full screen like any other app."
          confirmLabel="Got it"
          onCancel={() => setHelp(false)}
          onConfirm={() => setHelp(false)}
        />
      )}
    </>
  );
}
