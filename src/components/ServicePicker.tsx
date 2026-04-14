import type { Service } from '../config/services';

interface Props {
  services: Service[];
  selected: string | null;
  onSelect: (slug: string) => void;
}

export default function ServicePicker({ services, selected, onSelect }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {services.map((s) => (
        <button
          key={s.slug}
          onClick={() => onSelect(s.slug)}
          className={`text-left p-6 border transition-all duration-200 flex flex-col gap-2 ${
            selected === s.slug
              ? 'border-[#C9897A] bg-[#C9897A]/10 shadow-sm'
              : 'border-[#EDE5D8] hover:border-[#C9897A]/50 hover:shadow-sm'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-[#3B2A1A] text-sm tracking-wide">
              {s.name}
            </h3>
            <span className="text-[#C9897A] font-medium text-sm whitespace-nowrap">
              {s.priceDisplay}
            </span>
          </div>
          <p className="text-xs text-[#3B2A1A]/60 leading-relaxed">{s.description}</p>
          <p className="text-xs text-[#8A9E85] tracking-widest uppercase mt-1">
            {s.duration} min
          </p>
        </button>
      ))}
    </div>
  );
}
