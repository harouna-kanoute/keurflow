// Simple share link, not the WhatsApp Business API (explicitly out of MVP
// scope, §52) — opens WhatsApp's own share dialog with a prefilled message,
// same as any "share to WhatsApp" button on the web.
export function WhatsAppShareLink({ text }: { text: string }) {
  const href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 rounded-full border border-current px-2.5 py-1 text-xs font-medium opacity-80 hover:opacity-100"
      aria-label="Partager sur WhatsApp"
    >
      WhatsApp
    </a>
  );
}
