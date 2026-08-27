import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    const contact = await prisma.emergencyContact.findFirst({
      where: {
        verificationToken: token,
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 404 }
      );
    }

    if (contact.isVerified) {
      return NextResponse.json({
        success: true,
        message: 'Contact is already verified',
      });
    }

    const invitation = await prisma.contactInvitation.findFirst({
      where: {
        contactId: contact.id,
        token,
        status: 'PENDING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired verification invitation' },
        { status: 404 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.contactInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });

      return NextResponse.json(
        { error: 'Verification link has expired' },
        { status: 410 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.emergencyContact.update({
        where: { id: contact.id },
        data: {
          isVerified: true,
          isActive: true,
          verifiedAt: new Date(),
          verificationToken: null,
        },
      });

      await tx.contactInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
        },
      });
    });

    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SafeLink - Email Verified</title>
        </head>
        <body style="font-family: Arial, sans-serif; background:#f9fafb; padding:40px;">
          <div style="max-width:600px; margin:40px auto; background:white; padding:40px; border-radius:12px; text-align:center; border:1px solid #e5e7eb;">
            <div style="font-size:48px;">✓</div>

            <h1 style="color:#16a34a;">
              Email Verified Successfully
            </h1>

            <p style="font-size:18px; color:#374151;">
              Thank you, ${contact.name}.
            </p>

            <p style="color:#6b7280;">
              You are now verified as a SafeLink emergency contact.
            </p>

            <p style="color:#6b7280;">
              You may now receive emergency alerts from SafeLink.
            </p>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    );
  } catch (error) {
    console.error('Verify contact error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}