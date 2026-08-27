'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Check,
  Loader2,
  User,
  Smartphone,
  MapPin,
  Bell,
  Shield,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const deviceSchema = z.object({
  deviceName: z.string().min(1, 'Device name is required'),
  deviceModel: z.string().optional(),
});

const contactSchema = z.object({
  name: z.string().min(1, 'Contact name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  relationship: z.string().optional(),
});

const permissionsSchema = z.object({
  locationSharing: z.boolean(),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  alertSound: z.boolean(),
  vibration: z.boolean(),
});

type Step = 'profile' | 'device' | 'contacts' | 'permissions' | 'complete';

const STEPS: {
  id: Step;
  title: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: 'profile',
    title: 'Profile',
    icon: <User className="h-5 w-5" />,
    description: 'Set up your display name',
  },
  {
    id: 'device',
    title: 'Device',
    icon: <Smartphone className="h-5 w-5" />,
    description: 'Pair your safety watch',
  },
  {
    id: 'contacts',
    title: 'Contacts',
    icon: <MapPin className="h-5 w-5" />,
    description: 'Add emergency contacts',
  },
  {
    id: 'permissions',
    title: 'Permissions',
    icon: <Shield className="h-5 w-5" />,
    description: 'Configure privacy settings',
  },
  {
    id: 'complete',
    title: 'Complete',
    icon: <Check className="h-5 w-5" />,
    description: "You're all set!",
  },
];

export default function OnboardingPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<Step>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contacts, setContacts] = useState<
    Array<{
      name: string;
      email: string;
      phone: string;
      relationship: string;
    }>
  >([]);

  const [editingContact, setEditingContact] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: session?.user?.name || '',
    deviceName: 'SafeLink Watch',
    deviceModel: '',
    locationSharing: true,
    emailNotifications: true,
    pushNotifications: true,
    alertSound: true,
    vibration: true,
  });

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const handleNext = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (currentStep === 'profile') {
        profileSchema.parse({ name: formData.name });

        const response = await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formData.name }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setError(
            typeof data?.error === 'string'
              ? data.error
              : 'Failed to save your profile.'
          );
          return;
        }

        await update();
        setCurrentStep('device');
      } else if (currentStep === 'device') {
        deviceSchema.parse({
          deviceName: formData.deviceName,
          deviceModel: formData.deviceModel,
        });

        const response = await fetch('/api/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.deviceName,
            model: formData.deviceModel,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            typeof data?.error === 'string'
              ? data.error
              : 'Failed to register device.';

          setError(message);
          return;
        }

        setCurrentStep('contacts');
      } else if (currentStep === 'contacts') {
        if (contacts.length === 0) {
          setError('Please add at least one emergency contact');
          return;
        }

        for (const contact of contacts) {
          contactSchema.parse(contact);

          const response = await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contact),
          });

          const data = await response.json().catch(() => null);

          if (!response.ok) {
            const message =
              typeof data?.error === 'string'
                ? data.error
                : 'Failed to add emergency contact.';

            setError(message);
            return;
          }
        }

        setCurrentStep('permissions');
      } else if (currentStep === 'permissions') {
        permissionsSchema.parse({
          locationSharing: formData.locationSharing,
          emailNotifications: formData.emailNotifications,
          pushNotifications: formData.pushNotifications,
          alertSound: formData.alertSound,
          vibration: formData.vibration,
        });

        const response = await fetch('/api/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: formData }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setError(
            typeof data?.error === 'string'
              ? data.error
              : 'Failed to save your settings.'
          );
          return;
        }

        setCurrentStep('complete');
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setError(null);
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const addContact = () => {
    setContacts([
      ...contacts,
      {
        name: '',
        email: '',
        phone: '',
        relationship: '',
      },
    ]);

    setEditingContact(contacts.length);
  };

  const updateContact = (
    index: number,
    field: string,
    value: string
  ) => {
    const newContacts = [...contacts];

    newContacts[index] = {
      ...newContacts[index],
      [field]: value,
    };

    setContacts(newContacts);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));

    if (editingContact === index) {
      setEditingContact(null);
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30 pt-16">
      <div className="mx-auto max-w-2xl px-4 py-8">

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emergency text-emergency-foreground">
                <Shield className="h-6 w-6" />
              </div>

              <span className="font-bold text-xl">
                SafeLink
              </span>
            </div>
          </div>

          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-emergency transition-all duration-300"
              style={{
                width: `${((currentStepIndex + 1) / STEPS.length) * 100}%`,
              }}
            />
          </div>

          <div className="flex justify-between mt-4">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                    index < currentStepIndex
                      ? 'bg-emergency border-emergency text-emergency-foreground'
                      : index === currentStepIndex
                        ? 'border-emergency bg-background text-emergency'
                        : 'border-muted bg-background text-muted-foreground'
                  )}
                >
                  {index < currentStepIndex ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>

                <span
                  className={cn(
                    'text-xs font-medium',
                    index <= currentStepIndex
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              {STEPS[currentStepIndex].title}
            </CardTitle>

            <p className="text-muted-foreground">
              {STEPS[currentStepIndex].description}
            </p>
          </CardHeader>

          <CardContent>

            {currentStep === 'profile' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Display Name
                  </Label>

                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    placeholder="Enter your name"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {currentStep === 'device' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deviceName">
                    Device Name
                  </Label>

                  <Input
                    id="deviceName"
                    value={formData.deviceName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deviceName: e.target.value,
                      })
                    }
                    placeholder="e.g., SafeLink Watch"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deviceModel">
                    Device Model (Optional)
                  </Label>

                  <Input
                    id="deviceModel"
                    value={formData.deviceModel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deviceModel: e.target.value,
                      })
                    }
                    placeholder="e.g., Apple Watch Series 9"
                  />
                </div>

                <Alert>
                  <AlertDescription>
                    If you don't have a physical device yet,
                    you can use the watch simulator in the browser.
                    Real device pairing will be available in a future update.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {currentStep === 'contacts' && (
              <div className="space-y-4">

                <div className="flex items-center justify-between">
                  <Label>
                    Emergency Contacts
                  </Label>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addContact}
                  >
                    Add Contact
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Add at least one verified contact who will receive
                  emergency alerts.
                </p>

                {contacts.length === 0 ? (
                  <div className="text-center py-8">
                    <Button
                      variant="outline"
                      onClick={addContact}
                      className="w-full"
                    >
                      Add Your First Contact
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contacts.map((contact, index) => (
                      <div
                        key={index}
                        className={cn(
                          'p-4 rounded-lg border transition-colors',
                          editingContact === index
                            ? 'border-primary bg-primary/5'
                            : 'border-muted'
                        )}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">

                          <div className="flex-1 space-y-3">

                            <div className="grid gap-3 sm:grid-cols-2">

                              <div className="space-y-1">
                                <Label htmlFor={`contact-name-${index}`}>
                                  Name *
                                </Label>

                                <Input
                                  id={`contact-name-${index}`}
                                  value={contact.name}
                                  onChange={(e) =>
                                    updateContact(
                                      index,
                                      'name',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Contact name"
                                  disabled={
                                    editingContact !== index &&
                                    editingContact !== null
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor={`contact-email-${index}`}>
                                  Email *
                                </Label>

                                <Input
                                  id={`contact-email-${index}`}
                                  type="email"
                                  value={contact.email}
                                  onChange={(e) =>
                                    updateContact(
                                      index,
                                      'email',
                                      e.target.value
                                    )
                                  }
                                  placeholder="email@example.com"
                                  disabled={
                                    editingContact !== index &&
                                    editingContact !== null
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <Label htmlFor={`contact-phone-${index}`}>
                                  Phone (Optional)
                                </Label>

                                <Input
                                  id={`contact-phone-${index}`}
                                  value={contact.phone}
                                  onChange={(e) =>
                                    updateContact(
                                      index,
                                      'phone',
                                      e.target.value
                                    )
                                  }
                                  placeholder="+1 (555) 000-0000"
                                  disabled={
                                    editingContact !== index &&
                                    editingContact !== null
                                  }
                                />
                              </div>

                              <div className="space-y-1">
                                <Label
                                  htmlFor={`contact-relationship-${index}`}
                                >
                                  Relationship
                                </Label>

                                <Input
                                  id={`contact-relationship-${index}`}
                                  value={contact.relationship}
                                  onChange={(e) =>
                                    updateContact(
                                      index,
                                      'relationship',
                                      e.target.value
                                    )
                                  }
                                  placeholder="Family, Friend, Caregiver"
                                  disabled={
                                    editingContact !== index &&
                                    editingContact !== null
                                  }
                                />
                              </div>

                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {editingContact === index ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setEditingContact(null)
                                  }
                                >
                                  Done
                                </Button>

                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    removeContact(index)
                                  }
                                >
                                  Remove
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setEditingContact(index)
                                }
                              >
                                Edit
                              </Button>
                            )}
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentStep === 'permissions' && (
              <div className="space-y-6">

                <div className="space-y-4">
                  <h4 className="font-semibold">
                    Location Sharing
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>
                          Share Location During Emergency
                        </Label>

                        <p className="text-sm text-muted-foreground">
                          Allow contacts to see your live location
                          when you trigger an alert
                        </p>
                      </div>

                      <Switch
                        checked={formData.locationSharing}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            locationSharing: checked,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-semibold">
                    Notifications
                  </h4>

                  <div className="space-y-3">

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>
                          Email Notifications
                        </Label>

                        <p className="text-sm text-muted-foreground">
                          Receive emergency alerts via email
                        </p>
                      </div>

                      <Switch
                        checked={formData.emailNotifications}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            emailNotifications: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>
                          Push Notifications
                        </Label>

                        <p className="text-sm text-muted-foreground">
                          Receive browser push notifications for alerts
                        </p>
                      </div>

                      <Switch
                        checked={formData.pushNotifications}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            pushNotifications: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>
                          Alert Sound
                        </Label>

                        <p className="text-sm text-muted-foreground">
                          Play alarm sound when emergency alert is received
                        </p>
                      </div>

                      <Switch
                        checked={formData.alertSound}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            alertSound: checked,
                          })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>
                          Vibration
                        </Label>

                        <p className="text-sm text-muted-foreground">
                          Vibrate device when emergency alert is received
                        </p>
                      </div>

                      <Switch
                        checked={formData.vibration}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            vibration: checked,
                          })
                        }
                      />
                    </div>

                  </div>
                </div>
              </div>
            )}

            {currentStep === 'complete' && (
              <div className="text-center py-8">

                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-safe/10 text-safe">
                  <Check className="h-10 w-10" />
                </div>

                <h3 className="mb-2 text-xl font-bold">
                  You're All Set!
                </h3>

                <p className="mb-6 text-muted-foreground">
                  Your SafeLink account is ready. You can now use
                  the watch interface to trigger emergency alerts
                  and your contacts will be notified immediately.
                </p>

                <div className="flex flex-col gap-3">

                  <Button
                    size="lg"
                    onClick={() => router.push('/watch')}
                  >
                    <ArrowRight className="h-4 w-4" />
                    Try Watch Interface
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => router.push('/dashboard')}
                  >
                    Go to Dashboard
                  </Button>

                </div>
              </div>
            )}

          </CardContent>
        </Card>

        <div className="mt-6 flex justify-between">

          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0 || isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep !== 'complete' ? (
            <Button
              onClick={handleNext}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          ) : null}

        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          <strong>Important:</strong> SafeLink is a safety-support
          tool and does not replace emergency services. In immediate
          danger, contact local emergency services (911 in US,
          112 in EU, 999 in UK).
        </p>

      </div>
    </div>
  );
}