/** The ADUF AI logo (public/logo.png). One component so the sidebar, mobile
 *  header and sign-in screens always show the same mark. */
export function BrandLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="ADUF AI"
      width={64}
      height={64}
      draggable={false}
      className={`shrink-0 select-none rounded-[22%] object-cover ${className}`}
    />
  );
}
