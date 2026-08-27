import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateToken, isValidEmail } from '@/lib/utils';
import { z } from 'zod';

const updateContactSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  relationship: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

function getUserId(session: any): string {
  return (session?.user as any)?.id;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const contact = await prisma.emergencyContact.findFirst({
      where: { id, userId },
      include: {
        invitations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Get contact error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateContactSchema.parse(body);

    const contact = await prisma.emergencyContact.findFirst({
      where: { id, userId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (validated.email && validated.email !== contact.email) {
      if (!isValidEmail(validated.email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }

      const existingContact = await prisma.emergencyContact.findFirst({
        where: { userId, email: validated.email, NOT: { id } },
      });

      if (existingContact) {
        return NextResponse.json(
          { error: 'Contact with this email already exists' },
          { status: 400 }
        );
      }

      const verificationToken = generateToken(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.contactInvitation.create({
        data: {
          inviterId: userId,
          contactId: contact.id,
          email: validated.email,
          token: generateToken(32),
          expiresAt,
        },
      });

      const updated = await prisma.emergencyContact.update({
        where: { id },
        data: {
          ...validated,
          email: validated.email,
          isVerified: false,
          verificationToken,
          verifiedAt: null,
        },
      });

      return NextResponse.json({ contact: updated });
    }

    const updated = await prisma.emergencyContact.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({ contact: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Update contact error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const contact = await prisma.emergencyContact.findFirst({
      where: { id, userId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    await prisma.emergencyContact.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete contact error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}