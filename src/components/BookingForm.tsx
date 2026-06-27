import { useState } from 'react';

interface Props {
  onSubmit: (data: { name: string; email: string }) => void;
  loading: boolean;
}

export default function BookingForm({ onSubmit, loading }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !privacyAcknowledged) return;
    onSubmit({ name: name.trim(), email: email.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="booking-name" className="text-xs tracking-[0.2em] uppercase text-[#3B2A1A]/60">
          Full Name
        </label>
        <input
          id="booking-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border border-[#EDE5D8] bg-white px-4 py-2.5 text-sm text-[#3B2A1A] focus:border-[#C9897A] focus:outline-none transition-colors"
          placeholder="Jane Smith"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="booking-email" className="text-xs tracking-[0.2em] uppercase text-[#3B2A1A]/60">
          Email
        </label>
        <input
          id="booking-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-[#EDE5D8] bg-white px-4 py-2.5 text-sm text-[#3B2A1A] focus:border-[#C9897A] focus:outline-none transition-colors"
          placeholder="jane@example.com"
        />
      </div>

      <label
        htmlFor="booking-privacy-acknowledgment"
        className="flex items-start gap-3 border border-[#EDE5D8] bg-[#D8E2DC]/25 px-4 py-3 text-sm leading-relaxed text-[#3B2A1A]/75"
      >
        <input
          id="booking-privacy-acknowledgment"
          type="checkbox"
          required
          checked={privacyAcknowledged}
          onChange={(e) => setPrivacyAcknowledged(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#C9897A]"
        />
        <span>
          To help protect your privacy, please avoid sharing medical history or detailed health information here. Any necessary intake information will be collected separately.
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || !name.trim() || !email.trim() || !privacyAcknowledged}
        className="bg-[#C9897A] text-white text-xs tracking-[0.25em] uppercase px-8 py-3 hover:bg-[#3B2A1A] transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Redirecting to payment…' : 'Continue to Payment'}
      </button>
    </form>
  );
}
