import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { sendEmail, generateAlertEmail } from '@/lib/email';

const createAlertSchema = z.object({
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  locationAccuracy: z.number().positive().optional(),
  isTest: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Record<string, unknown> = {
      userId: (session.user as any).id,
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    const [alerts, total] = await Promise.all([
      prisma.emergencyAlert.findMany({
        where,
        orderBy: { triggeredAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          recipients: {
            select: {
              id: true,
              name: true,
              email: true,
              isNotified: true,
              notifiedAt: true,
              accessToken: true,
            },
          },
          acknowledgements: {
            select: {
              id: true,
              userId: true,
              createdAt: true,
            },
          },
          locationUpdates: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.emergencyAlert.count({ where }),
    ]);

    return NextResponse.json({
      alerts,
      total,
      hasMore: offset + alerts.length < total,
    });
  } catch (error) {
    console.error('Get alerts error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = createAlertSchema.parse(body);

    const activeAlert = await prisma.emergencyAlert.findFirst({
      where: {
        userId: (session.user as any).id,
        status: {
          in: [
            'PENDING_CONFIRMATION',
            'ACTIVE',
            'ACKNOWLEDGED',
          ],
        },
      },
    });

    if (activeAlert) {
      return NextResponse.json(
        {
          error: 'An active alert already exists',
          alertId: activeAlert.id,
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: (session.user as any).id,
      },
      include: {
        contacts: {
          where: {
            isActive: true,
            isVerified: true,
          },
        },
        settings: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.contacts.length === 0) {
      return NextResponse.json(
        {
          error: 'No verified emergency contacts configured',
        },
        { status: 400 }
      );
    }

    const alert = await prisma.emergencyAlert.create({
      data: {
        userId: (session.user as any).id,
        status: validated.isTest
          ? 'ACTIVE'
          : 'PENDING_CONFIRMATION',
        locationLat: validated.locationLat,
        locationLng: validated.locationLng,
        locationAccuracy: validated.locationAccuracy,
        locationUpdatedAt: validated.locationLat
          ? new Date()
          : null,
        metadata: {
          isTest: validated.isTest || false,
        },
      },
    });

    const recipients = await Promise.all(
      user.contacts.map((contact) =>
        prisma.alertRecipient.create({
          data: {
            alertId: alert.id,
            contactId: contact.id,
            userId: (session.user as any).id,
            email: contact.email,
            name: contact.name,
          },
        })
      )
    );

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';

    const emailResults = await Promise.all(
      recipients.map(async (recipient) => {
        try {
          const emailData = generateAlertEmail({
            userName: user.name || 'SafeLink User',
            userEmail: user.email,
            alertTime: alert.triggeredAt,
            alertToken: alert.alertToken,
            accessToken: recipient.accessToken,
            contactName: recipient.name,
            contactEmail: recipient.email,
            isTest: validated.isTest || false,
            locationUrl:
              validated.locationLat !== undefined &&
              validated.locationLng !== undefined
                ? `${appUrl}/access/alert/${alert.alertToken}?token=${encodeURIComponent(
                    recipient.accessToken
                  )}`
                : undefined,
          });

          const result = await sendEmail({
            to: recipient.email,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
          });

          if (result.success) {
            await prisma.alertRecipient.update({
              where: {
                id: recipient.id,
              },
              data: {
                isNotified: true,
                notifiedAt: new Date(),
              },
            });

            return {
              email: recipient.email,
              success: true,
            };
          }

          console.error(
            `Failed to send alert email to ${recipient.email}:`,
            result.error
          );

          return {
            email: recipient.email,
            success: false,
            error: result.error,
          };
        } catch (emailError) {
          console.error(
            `Alert email error for ${recipient.email}:`,
            emailError
          );

          return {
            email: recipient.email,
            success: false,
            error:
              emailError instanceof Error
                ? emailError.message
                : 'Email sending failed',
          };
        }
      })
    );

    return NextResponse.json(
      {
        alert,
        recipients,
        emailResults,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }

    console.error('Create alert error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}