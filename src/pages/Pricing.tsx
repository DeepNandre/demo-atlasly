import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Users, Building2, Sparkles } from 'lucide-react';
import Header from '@/components/Header';

const tiers = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for students and hobbyists',
    icon: Sparkles,
    features: [
      '2 site packs per month',
      '500m radius maximum',
      'PDF export only',
      'Basic AI chat',
      'Community support',
    ],
    cta: 'Get Started',
    popular: false,
    color: 'default',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For professional architects and designers',
    icon: Zap,
    features: [
      '20 site packs per month',
      '2km radius maximum',
      'All export formats (DXF, DWG, GLB, PDF, SKP)',
      'Unlimited AI chat',
      'Solar analysis included',
      'Climate data included',
      'Email support',
    ],
    cta: 'Start Pro Trial',
    popular: true,
    color: 'primary',
  },
  {
    id: 'teams',
    name: 'Teams',
    price: '$299',
    period: '/month',
    description: 'For architecture firms and teams',
    icon: Users,
    features: [
      'Unlimited site packs',
      'Unlimited radius',
      '5 team members',
      'Portfolio dashboard',
      'API access (10k calls/month)',
      'White-label exports',
      'Admin metrics dashboard',
      'Team collaboration',
      'Priority support',
    ],
    cta: 'Start Teams Trial',
    popular: false,
    color: 'secondary',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with custom needs',
    icon: Building2,
    features: [
      'Everything in Teams',
      'Unlimited team members',
      'Custom API limits',
      'Dedicated support',
      'SLA guarantees',
      'On-premise deployment option',
      'Custom training',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    popular: false,
    color: 'default',
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const handleSelectTier = (tierId: string) => {
    if (tierId === 'enterprise') {
      // Navigate to contact form
      navigate('/#contact');
    } else {
      // Navigate to signup with tier pre-selected
      navigate(`/auth?tier=${tierId}&mode=signup`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-6 py-24 mt-16">
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4">
            Pricing
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground">
            Choose the plan that fits your needs. All plans include core features.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm ${billingPeriod === 'monthly' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
            className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-primary transition-transform ${
                billingPeriod === 'annual' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm ${billingPeriod === 'annual' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
            Annual
            <Badge variant="secondary" className="ml-2">
              Save 20%
            </Badge>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <Card
                key={tier.id}
                className={`relative flex flex-col ${
                  tier.popular ? 'border-primary shadow-lg scale-105' : ''
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <CardTitle>{tier.name}</CardTitle>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.period && (
                      <span className="text-muted-foreground">{tier.period}</span>
                    )}
                  </div>
                  <CardDescription className="mt-2">
                    {tier.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    onClick={() => handleSelectTier(tier.id)}
                    variant={tier.popular ? 'default' : 'outline'}
                    className="w-full"
                    size="lg"
                  >
                    {tier.cta}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-24">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Can I change plans later?</h3>
              <p className="text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground">
                We accept all major credit cards (Visa, Mastercard, American Express) via Stripe.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-muted-foreground">
                The Free plan is available indefinitely. Pro and Teams plans come with a 14-day free trial.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">What happens if I exceed my monthly limit?</h3>
              <p className="text-muted-foreground">
                You'll be notified when you reach 80% of your limit. You can either upgrade to a higher tier or wait until your limit resets at the start of the next month.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Can I add more team members?</h3>
              <p className="text-muted-foreground">
                Teams plan includes 5 members. Need more? Contact us about Enterprise pricing for unlimited team members.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
