export default function Logo({ className = "w-8 h-8", color = "text-primary" }: { className?: string, color?: string }) {
  return (
    <div className={`flex items-center justify-center ${className} ${color}`}>
      <svg viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="120" fill="#0b0f1a"/><rect x="96" y="112" width="144" height="288" rx="36" fill="#4f46e5"/><rect x="272" y="112" width="144" height="288" rx="36" fill="#e5e7eb"/><path d="M256 96v320" stroke="#0b0f1a" strokeWidth="24" strokeLinecap="round"/><path d="M256 128v256" stroke="#6366f1" stroke-width="6" stroke-linecap="round" opacity=".8"/></svg>
    </div>
  );
}