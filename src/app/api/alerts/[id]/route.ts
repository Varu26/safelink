import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendAlertEmail, sendResolutionEmail } from '@/lib/email';
import { z } from 'zod';

const confirmAlertSchema = z.object({
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  locationAccuracy: z.number().positive().optional(),
});

const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    const alert = await prisma.emergencyAlert.findUnique({
      where: { id },
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
              accessToken: true,
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
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    if (session?.user && (session.user as any)?.id) {
      const isOwner = alert.userId === (session.user as any).id;
      const isRecipient = alert.recipients.some((r) => r.userId === (session.user as any).id);
      
      if (!isOwner && !isRecipient) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return NextResponse.json({ alert });
  } catch (error) {
    console.error('Get alert error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const alert = await prisma.emergencyAlert.findUnique({
      where: { id },
      include: {
        recipients: true,
        user: true,
      },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const isOwner = alert.userId === (session.user as any).id;

    if (body.action === 'confirm' && alert.status === 'PENDING_CONFIRMATION') {
      if (!isOwner) {
        return NextResponse.json({ error: 'Only the alert owner can confirm' }, { status: 403 });
      }

      const validated = confirmAlertSchema.parse(body);

      const updated = await prisma.emergencyAlert.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          confirmedAt: new Date(),
          locationLat: validated.locationLat ?? alert.locationLat,
          locationLng: validated.locationLng ?? alert.locationLng,
          locationAccuracy: validated.locationAccuracy ?? alert.locationAccuracy,
          locationUpdatedAt: validated.locationLat ? new Date() : alert.locationUpdatedAt,
        },
      });

      if (validated.locationLat && validated.locationLng) {
        await prisma.locationUpdate.create({
          data: {
            alertId: id,
            lat: validated.locationLat,
            lng: validated.locationLng,
            accuracy: validated.locationAccuracy,
          },
        });
      }

      const activeRecipients = alert.recipients.filter((r) => !r.isNotified);
      
      for (const recipient of activeRecipients) {
        const emailResult = await sendAlertEmail({
          userName: alert.user.name || 'Unknown User',
          userEmail: alert.user.email,
          alertTime: alert.triggeredAt,
          alertToken: alert.alertToken,
          accessToken: recipient.accessToken,
          contactName: recipient.name,
          contactEmail: recipient.email,
          isTest: (alert.metadata as any)?.isTest === true,
        });

        await prisma.alertRecipient.update({
          where: { id: recipient.id },
          data: {
            isNotified: true,
            notifiedAt: new Date(),
            emailSent: emailResult.success,
            emailSentAt: emailResult.success ? new Date() : null,
            emailError: emailResult.error,
          },
        });

await prisma.notificationLog.create({
            data: {
              alertId: id,
              userId: (session.user as any).id,
              recipientId: recipient.id,
              type: 'EMAIL',
              status: emailResult.success ? 'SENT' : 'FAILED',
              provider: 'nodemailer',
              providerId: emailResult.messageId,
              error: emailResult.error,
            },
          });
      }

      return NextResponse.json({ alert: updated });
    }

    if (body.action === 'resolve' && ['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status)) {
      if (!isOwner) {
        return NextResponse.json({ error: 'Only the alert owner can resolve' }, { status: 403 });
      }

      const updated = await prisma.emergencyAlert.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });

      for (const recipient of alert.recipients) {
        if (recipient.isNotified) {
          const emailResult = await sendResolutionEmail({
            userName: alert.user.name || 'Unknown User',
            alertTime: alert.triggeredAt,
            resolvedAt: new Date(),
            contactName: recipient.name,
            contactEmail: recipient.email,
            resolvedBy: 'user',
            isTest: (alert.metadata as any)?.isTest === true,
          });

          await prisma.notificationLog.create({
            data: {
              alertId: id,
              userId: (session.user as any).id,
              recipientId: recipient.id,
              type: 'EMAIL',
              status: emailResult.success ? 'SENT' : 'FAILED',
              provider: 'nodemailer',
              providerId: emailResult.messageId,
              error: emailResult.error,
            },
          });
        }
      }

      return NextResponse.json({ alert: updated });
    }

    if (body.action === 'cancel' && ['PENDING_CONFIRMATION', 'ACTIVE', 'ACKNOWLEDGED'].includes(alert.status)) {
      if (!isOwner) {
        return NextResponse.json({ error: 'Only the alert owner can cancel' }, { status: 403 });
      }

      const updated = await prisma.emergencyAlert.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      for (const recipient of alert.recipients) {
        if (recipient.isNotified) {
          const emailResult = await sendResolutionEmail({
            userName: alert.user.name || 'Unknown User',
            alertTime: alert.triggeredAt,
            resolvedAt: new Date(),
            contactName: recipient.name,
            contactEmail: recipient.email,
            resolvedBy: 'user',
            isTest: (alert.metadata as any)?.isTest === true,
          });

          await prisma.notificationLog.create({
            data: {
              alertId: id,
              userId: (session.user as any).id,
              recipientId: recipient.id,
              type: 'EMAIL',
              status: emailResult.success ? 'SENT' : 'FAILED',
              provider: 'nodemailer',
              providerId: emailResult.messageId,
              error: emailResult.error,
            },
          });
        }
      }

      return NextResponse.json({ alert: updated });
    }

    if (body.action === 'acknowledge' && ['PENDING_CONFIRMATION', 'ACTIVE', 'ACKNOWLEDGED'].includes(alert.status)) {
      const currentUserId = (session.user as any).id;

      const recipient = alert.recipients.find(
        (r) => r.userId === currentUserId
      );

      if (!recipient) {
        return NextResponse.json(
          { error: 'Only an emergency contact can acknowledge this alert' },
          { status: 403 }
        );
      }

      const existingAck = await prisma.alertAcknowledgement.findUnique({
        where: {
          alertId_userId: {
            alertId: id,
            userId: currentUserId,
          },
        },
      });

      if (existingAck) {
        return NextResponse.json(
          { error: 'Already acknowledged' },
          { status: 400 }
        );
      }

      await prisma.alertAcknowledgement.create({
        data: {
          alertId: id,
          userId: currentUserId,
          recipientId: recipient.id,
        },
      });

      const updated = await prisma.emergencyAlert.update({
        where: { id },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
        },
      });

      return NextResponse.json({ alert: updated });
    }

    if (body.action === 'updateLocation' && ['ACTIVE', 'ACKNOWLEDGED'].includes(alert.status)) {
      if (!isOwner) {
        return NextResponse.json({ error: 'Only the alert owner can update location' }, { status: 403 });
      }

      const validated = updateLocationSchema.parse(body);

      await prisma.emergencyAlert.update({
        where: { id },
        data: {
          locationLat: validated.lat,
          locationLng: validated.lng,
          locationAccuracy: validated.accuracy,
          locationUpdatedAt: new Date(),
        },
      });

      await prisma.locationUpdate.create({
        data: {
          alertId: id,
          lat: validated.lat,
          lng: validated.lng,
          accuracy: validated.accuracy,
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action or alert state' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Update alert error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}