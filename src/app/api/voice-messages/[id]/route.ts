import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function getUserId(session: any): string | null {
  return (session?.user as any)?.id;
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

    const message = await prisma.voiceMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return NextResponse.json({ error: 'Voice message not found' }, { status: 404 });
    }

    // Verify recipient
    if (message.recipientId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const updated = await prisma.voiceMessage.update({
      where: { id },
      data: {
        isPlayed: body.isPlayed ?? message.isPlayed,
        playedAt: body.isPlayed ? new Date() : message.playedAt,
        transcript: body.transcript ?? message.transcript,
      },
    });

    return NextResponse.json({ voiceMessage: updated });
  } catch (error) {
    console.error('Update voice message error:', error);
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

    const message = await prisma.voiceMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return NextResponse.json({ error: 'Voice message not found' }, { status: 404 });
    }

    // Only sender can delete
    if (message.senderId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await prisma.voiceMessage.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete voice message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}