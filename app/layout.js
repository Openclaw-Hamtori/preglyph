import './globals.css';

export const metadata = {
  title: 'Preglyph — verified humans leave public records',
  description:
    'Preglyph is a minimal writing surface where only verified humans can leave durable public records.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
