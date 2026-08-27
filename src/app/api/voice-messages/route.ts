import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const uploadVoiceSchema = z.object({
  alertId: z.string(),
  audioBase64: z.string().min(1),
  duration: z.number().positive(),
  mimeType: z.string().startsWith('audio/'),
});

function getUserId(session: any): string | null {
  return (session?.user as any)?.id;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = uploadVoiceSchema.parse(body);

    // Verify alert exists and is active
    const alert = await prisma.emergencyAlert.findUnique({
      where: { id: validated.alertId },
      include: {
        recipients: {
          where: { userId },
        },
      },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Check if user is authorized (owner or recipient)
    const isOwner = alert.userId === userId;
    const isRecipient = alert.recipients.length > 0;

    if (!isOwner && !isRecipient) {
      return NextResponse.json({ error: 'Not authorized to send voice message to this alert' }, { status: 403 });
    }

    // Determine recipient - if sender is owner, send to all active recipients
    // If sender is recipient, send to owner
    let recipientIds: string[] = [];

    if (isOwner) {
      // Owner sends to all notified recipients
      const notifiedRecipients = await prisma.alertRecipient.findMany({
        where: { alertId: validated.alertId, isNotified: true },
        select: { userId: true },
      });
      recipientIds = notifiedRecipients.map(r => r.userId).filter(id => id !== userId);
    } else {
      // Recipient sends to owner
      recipientIds = [alert.userId];
    }

    if (recipientIds.length === 0) {
      return NextResponse.json({ error: 'No recipients available' }, { status: 400 });
    }

    // Convert base64 to buffer (in production, upload to S3/Blob storage)
    const audioBuffer = Buffer.from(validated.audioBase64, 'base64');
    const fileSize = audioBuffer.length;

    // For demo, we'll store as base64 data URL
    // In production, upload to cloud storage and store URL
    const audioUrl = `data:${validated.mimeType};base64,${validated.audioBase64}`;

    // Create voice messages for each recipient
    const voiceMessages = await Promise.all(
      recipientIds.map(recipientId =>
        prisma.voiceMessage.create({
          data: {
            alertId: validated.alertId,
            senderId: userId,
            recipientId,
            audioUrl,
            duration: validated.duration,
            mimeType: validated.mimeType,
            fileSize,
          },
        })
      )
    );

    return NextResponse.json({ voiceMessages }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Upload voice message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('alertId');

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
    }

    // Verify access
    const alert = await prisma.emergencyAlert.findUnique({
      where: { id: alertId },
      include: {
        recipients: {
          where: { userId },
        },
      },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const isOwner = alert.userId === userId;
    const isRecipient = alert.recipients.length > 0;

    if (!isOwner && !isRecipient) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get voice messages for this user in this alert
    const messages = await prisma.voiceMessage.findMany({
      where: {
        alertId,
        recipientId: userId,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json({ voiceMessages: messages });
  } catch (error) {
    console.error('Get voice messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}