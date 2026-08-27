import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const verifySchema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = verifySchema.parse(body);

    const invitation = await prisma.contactInvitation.findUnique({
      where: { token },
      include: {
        contact: true,
        inviter: { select: { id: true, name: true, email: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invitation already processed' }, { status: 400 });
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.contactInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user || (session.user as any)?.email !== invitation.email) {
      return NextResponse.json(
        { error: 'This invitation is for a different email address' },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.contactInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });

      await tx.emergencyContact.update({
        where: { id: invitation.contactId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          userId: (session.user as any).id,
        },
      });
    });

    return NextResponse.json({ success: true, contact: invitation.contact });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Verify invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const invitation = await prisma.contactInvitation.findUnique({
      where: { token },
      include: {
        contact: { select: { id: true, name: true, email: true } },
        inviter: { select: { id: true, name: true, email: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Invitation already processed', status: invitation.status },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.contactInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 410 });
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        contact: invitation.contact,
        inviter: invitation.inviter,
      },
    });
  } catch (error) {
    console.error('Get invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}