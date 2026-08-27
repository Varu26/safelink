import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateDeviceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  model: z.string().max(50).optional(),
  firmwareVersion: z.string().max(20).optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  isConnected: z.boolean().optional(),
});

function getUserId(session: any): string | null {
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
    const device = await prisma.watchDevice.findFirst({
      where: { id, userId },
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({ device });
  } catch (error) {
    console.error('Get device error:', error);
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
    const validated = updateDeviceSchema.parse(body);

    const device = await prisma.watchDevice.findFirst({
      where: { id, userId },
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    const updated = await prisma.watchDevice.update({
      where: { id },
      data: {
        ...validated,
        lastSeen: new Date(),
      },
    });

    return NextResponse.json({ device: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Update device error:', error);
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
    const device = await prisma.watchDevice.findFirst({
      where: { id, userId },
    });

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    await prisma.watchDevice.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete device error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}