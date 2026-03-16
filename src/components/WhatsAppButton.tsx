import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER = '351918152116';
const WHATSAPP_URL = `https://web.whatsapp.com/send?phone=${WHATSAPP_NUMBER}`;

export function WhatsAppButton() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar via WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
      style={{ backgroundColor: '#25D366' }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 175.216 175.552"
        className="w-8 h-8"
      >
        <defs>
          <linearGradient id="wa-gradient" x1="85.915" x2="86.535" y1="32.567" y2="137.092" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#57d163" />
            <stop offset="1" stopColor="#23b33a" />
          </linearGradient>
        </defs>
        <path
          fill="#fff"
          d="M87.184 14.2c-40.5 0-73.4 32.9-73.4 73.4 0 12.9 3.4 25.5 9.8 36.6L14 175.6l52.5-9.4c10.6 5.8 22.6 8.8 34.7 8.8 40.5 0 73.4-32.9 73.4-73.4s-32.9-73.4-73.4-73.4zm0 134.1c-11.2 0-22.2-3.1-31.8-8.9l-2.3-1.4-23.6 6.2 6.3-23.1-1.5-2.4c-6.4-10.1-9.7-21.8-9.7-33.8 0-33.4 27.2-60.6 60.6-60.6 33.4 0 60.6 27.2 60.6 60.6s-27.2 60.6-60.6 60.6zm33.2-45.4c-1.8-0.9-10.7-5.3-12.4-5.9-1.7-0.6-2.9-0.9-4.1 0.9-1.2 1.8-4.7 5.9-5.8 7.1-1.1 1.2-2.1 1.4-3.9 0.5-1.8-0.9-7.6-2.8-14.5-8.9-5.4-4.8-9-10.6-10-12.4-1.1-1.8-0.1-2.8 0.8-3.7 0.8-0.8 1.8-2.1 2.7-3.2 0.9-1.1 1.2-1.8 1.8-3 0.6-1.2 0.3-2.3-0.2-3.2-0.5-0.9-4.1-9.9-5.6-13.5-1.5-3.5-3-3-4.1-3.1h-3.5c-1.2 0-3.2 0.5-4.9 2.3-1.7 1.8-6.4 6.3-6.4 15.3s6.6 17.7 7.5 18.9c0.9 1.2 12.9 19.7 31.2 27.6 4.4 1.9 7.8 3 10.4 3.9 4.4 1.4 8.4 1.2 11.5 0.7 3.5-0.5 10.7-4.4 12.2-8.6 1.5-4.2 1.5-7.8 1.1-8.6-0.5-0.8-1.7-1.3-3.5-2.2z"
        />
      </svg>
    </a>
  );
}
