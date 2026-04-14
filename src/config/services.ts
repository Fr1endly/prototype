export interface Service {
  slug: string;
  name: string;
  description: string;
  duration: number; // minutes
  price: number; // cents
  priceDisplay: string;
  stripePriceId: string; // Format: price_1ABC123XYZ... (from Stripe Dashboard → Products → Pricing)
  calEventTypeId: number; // Numeric ID from Cal.com Event Type settings
  category: 'consultation' | 'class';
}

/**
 * Services offered for booking.
 * 
 * To configure:
 * 1. Create a Product in Stripe Dashboard for each service
 * 2. Note the Price ID (looks like: price_1ABC123XYZ...)
 * 3. Create an Event Type in Cal.com for each service
 * 4. Find the Event Type ID from Cal.com settings (numeric)
 * 5. Update the values below with your IDs
 * 
 * See SETUP_PAYMENT_BOOKING.md for detailed instructions.
 */
export const services: Service[] = [
  {
    slug: 'initial-consultation',
    name: 'Initial Consultation',
    description:
      'Comprehensive in-home or virtual breastfeeding assessment with personalized care plan.',
    duration: 90,
    price: 17500, // $175.00 (in cents)
    priceDisplay: '$175',
    stripePriceId: 'price_1TLt7Y1r2KPL0OJsVXxL9sL6', // ← Replace with your Stripe Price ID
    calEventTypeId: 5351889, // ← Replace with your Cal.com Event Type ID
    category: 'consultation',
  },
  {
    slug: 'follow-up-consultation',
    name: 'Follow-Up Consultation',
    description:
      'Check-in visit to monitor progress and adjust your breastfeeding plan.',
    duration: 60,
    price: 12500, // $125.00
    priceDisplay: '$125',
    stripePriceId: 'price_1TLtB51r2KPL0OJsJyzrNILu', // ← Replace with your Stripe Price ID
    calEventTypeId: 5351912, // ← Replace with your Cal.com Event Type ID
    category: 'consultation',
  },
  {
    slug: 'prenatal-breastfeeding-class',
    name: 'Prenatal Breastfeeding Class',
    description:
      'Learn how lactation works, common challenges, and hospital practices so you feel prepared.',
    duration: 90,
    price: 5000, // $50.00
    priceDisplay: '$50',
    stripePriceId: 'price_1TLtEU1r2KPL0OJsDhRRlKa4', // ← Replace with your Stripe Price ID
    calEventTypeId: 5351916, // ← Replace with your Cal.com Event Type ID
    category: 'class',
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}
