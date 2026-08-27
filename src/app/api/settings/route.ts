import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  locationSharing: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  alertSound: z.boolean().optional(),
  vibration: z.boolean().optional(),
  autoResolveHours: z.number().min(1).max(168).optional(),
  testMode: z.boolean().optional(),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().url().optional(),
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

    const [user, settings, device] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      }),
      prisma.userSettings.findUnique({
        where: { userId },
      }),
      prisma.watchDevice.findFirst({
        where: { userId },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user,
      settings: settings || {
        locationSharing: true,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        alertSound: true,
        vibration: true,
        autoResolveHours: 24,
        testMode: false,
      },
      device,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { profile, settings } = body;

    if (profile) {
      const validated = updateProfileSchema.parse(profile);
      await prisma.user.update({
        where: { id: userId },
        data: validated,
      });
    }

    if (settings) {
      const validated = updateSettingsSchema.parse(settings);
      await prisma.userSettings.upsert({
        where: { userId },
        update: validated,
        create: {
          userId,
          ...validated,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}