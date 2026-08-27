import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateDeviceId } from '@/lib/utils';
import { z } from 'zod';

const registerDeviceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  model: z.string().max(50).optional(),
  firmwareVersion: z.string().max(20).optional(),
});

function getUserId(session: any): string | null {
  return (session?.user as any)?.id;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const devices = await prisma.watchDevice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ devices });
  } catch (error) {
    console.error('Get devices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = registerDeviceSchema.parse(body);

    const existingDevice = await prisma.watchDevice.findFirst({
      where: { userId, isPaired: true },
    });

    if (existingDevice) {
      return NextResponse.json(
        { error: 'A device is already paired. Unpair it first.' },
        { status: 400 }
      );
    }

    const device = await prisma.watchDevice.create({
      data: {
        userId,
        deviceId: generateDeviceId(),
        name: validated.name || 'SafeLink Watch',
        model: validated.model,
        firmwareVersion: validated.firmwareVersion,
        isPaired: true,
        pairedAt: new Date(),
        isConnected: true,
        lastSeen: new Date(),
      },
    });

    return NextResponse.json({ device }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Register device error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}