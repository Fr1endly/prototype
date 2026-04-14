import { useState, useEffect } from 'react';
import { services, getServiceBySlug, type Service } from '../config/services';
import ServicePicker from './ServicePicker';
import SlotPicker from './SlotPicker';
import BookingForm from './BookingForm';

const steps = ['Service', 'Date & Time', 'Your Info'] as const;

export default function BookingFlow() {
  const [step, setStep] = useState(0);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-select service from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const svc = params.get('service');
    if (svc && getServiceBySlug(svc)) {
      setSelectedSlug(svc);
      setStep(1);
    }
  }, []);

  const selectedService: Service | undefined = selectedSlug
    ? getServiceBySlug(selectedSlug)
    : undefined;

  const handleServiceSelect = (slug: string) => {
    setSelectedSlug(slug);
    setSelectedSlot(null);
    setStep(1);
  };

  const handleSlotSelect = (iso: string) => {
    setSelectedSlot(iso);
    setStep(2);
  };

  const handleFormSubmit = async ({ name, email }: { name: string; email: string }) => {
    if (!selectedService || !selectedSlot) return;
    setCheckoutLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripePriceId: selectedService.stripePriceId,
          calEventTypeId: selectedService.calEventTypeId,
          slot: selectedSlot,
          name,
          email,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          serviceSlug: selectedService.slug,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
        setCheckoutLoading(false);
      }
    } catch {
      setError('Network error. Please try again.');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((label, i) => (
          <button
            key={label}
            onClick={() => {
              if (i < step) setStep(i);
            }}
            disabled={i > step}
            className={`flex items-center gap-2 text-xs tracking-[0.2em] uppercase transition-colors ${
              i === step
                ? 'text-[#C9897A] font-medium'
                : i < step
                  ? 'text-[#8A9E85] cursor-pointer hover:text-[#C9897A]'
                  : 'text-[#3B2A1A]/30 cursor-default'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border ${
                i === step
                  ? 'border-[#C9897A] text-[#C9897A]'
                  : i < step
                    ? 'border-[#8A9E85] text-[#8A9E85] bg-[#8A9E85]/10'
                    : 'border-[#EDE5D8] text-[#3B2A1A]/30'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </span>
            {label}
            {i < steps.length - 1 && (
              <span className="w-8 h-px bg-[#EDE5D8] ml-1" />
            )}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {selectedService && step > 0 && (
        <div className="bg-[#D8E2DC]/40 px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[#3B2A1A]/70">
          <span>
            <strong className="text-[#3B2A1A]">{selectedService.name}</strong>{' '}
            · {selectedService.duration} min · {selectedService.priceDisplay}
          </span>
          {selectedSlot && (
            <span>
              {new Date(selectedSlot).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      )}

      {/* Step content */}
      {step === 0 && (
        <ServicePicker
          services={services}
          selected={selectedSlug}
          onSelect={handleServiceSelect}
        />
      )}

      {step === 1 && selectedService && (
        <SlotPicker
          eventTypeId={selectedService.calEventTypeId}
          selected={selectedSlot}
          onSelect={handleSlotSelect}
        />
      )}

      {step === 2 && (
        <BookingForm onSubmit={handleFormSubmit} loading={checkoutLoading} />
      )}

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}
    </div>
  );
}
