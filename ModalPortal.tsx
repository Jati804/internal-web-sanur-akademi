import React from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

// ✅ Render modal langsung ke document.body, lepas dari struktur DOM halaman.
// Ini bikin position:fixed selalu relatif ke viewport browser, nggak peduli
// ancestor manapun di atasnya (transform, filter, animate-in, dll).
const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  return createPortal(children, document.body);
};

export default ModalPortal;
