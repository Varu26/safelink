'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Users,
  Plus,
  Mail,
  Phone,
  User,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Trash2,
  Send,
  Shield,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function ContactsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      relationship: string | null;
      isVerified: boolean;
      isActive: boolean;
      verificationToken: string | null;
      verifiedAt: string | null;
      createdAt: string;
      invitations: Array<{
        id: string;
        token: string;
        expiresAt: string;
      }>;
    }>
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] =
    useState<typeof contacts[0] | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');

      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchContacts();
    }
  }, [status]);

  const openAddDialog = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      relationship: '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (contact: typeof contacts[0]) => {
    setEditingContact(contact);

    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone || '',
      relationship: contact.relationship || '',
    });

    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      if (editingContact) {
        const res = await fetch(
          `/api/contacts/${editingContact.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
          }
        );

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(
            typeof data?.error === 'string'
              ? data.error
              : 'Failed to update contact'
          );
        }

        toast({
          title: 'Contact updated',
        });
      } else {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(
            typeof data?.error === 'string'
              ? data.error
              : 'Failed to add contact'
          );
        }

        toast({
          title: 'Contact added',
          description: 'Verification email sent',
        });
      }

      setIsDialogOpen(false);

      await fetchContacts();
    } catch (error) {
      console.error('Contact submit error:', error);

      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete contact');
      }

      toast({
        title: 'Contact deleted',
      });

      fetchContacts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete contact',
        variant: 'destructive',
      });
    }
  };

  const handleResendInvitation = async (id: string) => {
    try {
      const res = await fetch(
        `/api/contacts/${id}/resend`,
        {
          method: 'POST',
        }
      );

      if (!res.ok) {
        throw new Error('Failed to resend invitation');
      }

      toast({
        title: 'Invitation resent',
        description: 'Verification email sent to contact',
      });

      fetchContacts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend invitation',
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (
    contact: typeof contacts[0]
  ) => {
    try {
      const res = await fetch(
        `/api/contacts/${contact.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isActive: !contact.isActive,
          }),
        }
      );

      if (!res.ok) {
        throw new Error('Failed to update contact');
      }

      fetchContacts();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update contact',
        variant: 'destructive',
      });
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background pt-16">
        <Header />

        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-background pt-16">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">
              Emergency Contacts
            </h1>

            <p className="text-muted-foreground">
              Manage contacts who will receive your emergency alerts
            </p>
          </div>

          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Your Emergency Contacts
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              Only verified, active contacts will receive emergency
              alerts. Each contact must verify their email address.
            </p>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />

                <p className="mt-4 text-lg text-muted-foreground">
                  No emergency contacts yet
                </p>

                <p className="text-sm text-muted-foreground">
                  Add your first contact to get started
                </p>

                <Button
                  className="mt-4"
                  onClick={openAddDialog}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>
            ) : (
              <div className="space-y-4">

                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">

                      <div className="flex items-center gap-4 flex-1 min-w-0">

                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">

                          <div className="flex items-center gap-2">

                            <h3 className="font-medium truncate">
                              {contact.name}
                            </h3>

                            {contact.isVerified ? (
                              <Badge
                                variant="success"
                                className="flex items-center gap-1"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge
                                variant="warning"
                                className="flex items-center gap-1"
                              >
                                <AlertCircle className="h-3 w-3" />
                                Pending
                              </Badge>
                            )}

                            {contact.isActive ? (
                              <Badge variant="default">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                Inactive
                              </Badge>
                            )}

                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">

                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </span>

                            {contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                              </span>
                            )}

                            {contact.relationship && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {contact.relationship}
                              </span>
                            )}

                          </div>

                          <p className="text-xs text-muted-foreground mt-1">
                            Added{' '}
                            {formatRelativeTime(contact.createdAt)}

                            {contact.verifiedAt &&
                              ` • Verified ${formatRelativeTime(
                                contact.verifiedAt
                              )}`}
                          </p>

                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">

                        {!contact.isVerified &&
                          contact.invitations.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleResendInvitation(
                                  contact.id
                                )
                              }
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Resend
                            </Button>
                          )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openEditDialog(contact)
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleToggleActive(contact)
                          }
                          className={
                            contact.isActive
                              ? ''
                              : 'text-muted-foreground'
                          }
                        >
                          <Shield className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleDelete(contact.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                      </div>
                    </div>
                  </div>
                ))}

              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              How It Works
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">

            <div className="grid gap-4 md:grid-cols-3">

              <div className="p-4 rounded-lg border">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                  <Mail className="h-5 w-5" />
                </div>

                <h4 className="font-semibold mb-1">
                  1. Add Contact
                </h4>

                <p className="text-sm text-muted-foreground">
                  Enter their name, email, and relationship.
                  We'll send a verification email.
                </p>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                  <CheckCircle className="h-5 w-5" />
                </div>

                <h4 className="font-semibold mb-1">
                  2. Verify Email
                </h4>

                <p className="text-sm text-muted-foreground">
                  Contact clicks the link in their email to
                  verify. Link expires in 7 days.
                </p>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                  <Shield className="h-5 w-5" />
                </div>

                <h4 className="font-semibold mb-1">
                  3. Receive Alerts
                </h4>

                <p className="text-sm text-muted-foreground">
                  Verified contacts get emergency alerts with
                  secure, expiring access links.
                </p>
              </div>

            </div>

          </CardContent>
        </Card>

      </main>

      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <DialogContent className="max-w-md">

          <DialogHeader>
            <DialogTitle>
              {editingContact
                ? 'Edit Contact'
                : 'Add Emergency Contact'}
            </DialogTitle>

            <DialogDescription>
              {editingContact
                ? 'Update the contact information. Email changes will require re-verification.'
                : 'This person will receive emergency alerts with your location when you trigger an SOS.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="name">
                Name *
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
                placeholder="Contact name"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Email *
              </Label>

              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value,
                  })
                }
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone (Optional)
              </Label>

              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    phone: e.target.value,
                  })
                }
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship">
                Relationship
              </Label>

              <Input
                id="relationship"
                value={formData.relationship}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    relationship: e.target.value,
                  })
                }
                placeholder="Family, Friend, Caregiver"
              />
            </div>

          </div>

          <DialogFooter>

            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !formData.name ||
                !formData.email
              }
            >
              {isSubmitting
                ? 'Saving...'
                : editingContact
                  ? 'Save Changes'
                  : 'Add Contact'}
            </Button>

          </DialogFooter>

        </DialogContent>
      </Dialog>

    </div>
  );
}