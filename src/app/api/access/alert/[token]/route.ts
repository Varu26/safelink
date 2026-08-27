import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatRelativeTime } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const recipient = await prisma.alertRecipient.findUnique({
      where: { accessToken: token },
      include: {
        alert: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
            recipients: {
              select: {
                id: true,
                name: true,
                email: true,
                userId: true,
                isNotified: true,
                notifiedAt: true,
              },
            },
            acknowledgements: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            locationUpdates: {
              orderBy: { timestamp: 'desc' },
            },
          },
        },
        contact: {
          select: { id: true, name: true, email: true, relationship: true },
        },
      },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: 'Invalid or expired access link' },
        { status: 404 }
      );
    }

    const alert = recipient.alert;
    const now = new Date();
    const expiresAt = new Date(
      alert.triggeredAt.getTime() + 24 * 60 * 60 * 1000
    );

    if (
      now > expiresAt &&
      alert.status !== 'RESOLVED' &&
      alert.status !== 'CANCELLED'
    ) {
      return NextResponse.json(
        { error: 'This access link has expired' },
        { status: 410 }
      );
    }

    if (['RESOLVED', 'CANCELLED', 'EXPIRED'].includes(alert.status)) {
      const latestLocation = alert.locationUpdates[0] || null;

      return NextResponse.json({
        alert: {
          ...alert,
          locationLat: latestLocation?.lat ?? alert.locationLat,
          locationLng: latestLocation?.lng ?? alert.locationLng,
          locationAccuracy:
            latestLocation?.accuracy ?? alert.locationAccuracy,
          locationUpdatedAt:
            latestLocation?.timestamp ?? alert.locationUpdatedAt,
        },
        recipient: {
          id: recipient.id,
          name: recipient.name,
          email: recipient.email,
          isNotified: recipient.isNotified,
          notifiedAt: recipient.notifiedAt,
        },
        contact: recipient.contact,
        canAcknowledge: false,
        canResolve: false,
        isExpired: true,
      });
    }

    const session = await getServerSession(authOptions);

    let currentUserId: string | null = null;
    let isContact = false;

    if (session?.user && (session.user as any)?.id) {
      currentUserId = (session.user as any).id;

      isContact = alert.recipients.some(
        (r) => r.userId === (session.user as any).id
      );
    } else if (recipient.userId) {
      isContact = true;
    }

    /*
     * FIX:
     * Allow the authorized emergency contact to acknowledge
     * the alert while it is PENDING_CONFIRMATION, ACTIVE,
     * or ACKNOWLEDGED.
     */
    const canAcknowledge =
      isContact &&
      ['PENDING_CONFIRMATION', 'ACTIVE', 'ACKNOWLEDGED'].includes(
        alert.status
      );

    const canResolve =
      alert.userId === currentUserId &&
      ['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status);

    const latestLocation = alert.locationUpdates[0] || null;

    return NextResponse.json({
      alert: {
        ...alert,
        locationLat: latestLocation?.lat ?? alert.locationLat,
        locationLng: latestLocation?.lng ?? alert.locationLng,
        locationAccuracy:
          latestLocation?.accuracy ?? alert.locationAccuracy,
        locationUpdatedAt:
          latestLocation?.timestamp ?? alert.locationUpdatedAt,
      },
      recipient: {
        id: recipient.id,
        name: recipient.name,
        email: recipient.email,
        isNotified: recipient.isNotified,
        notifiedAt: recipient.notifiedAt,
      },
      contact: recipient.contact,
      canAcknowledge,
      canResolve,
      isExpired: false,
    });
  } catch (error) {
    console.error('Get alert by token error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}