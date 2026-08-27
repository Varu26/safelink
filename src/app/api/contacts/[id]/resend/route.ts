import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/utils';
import { sendEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const contact = await prisma.emergencyContact.findFirst({
      where: { id, userId: (session.user as any).id },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (contact.isVerified) {
      return NextResponse.json(
        { error: 'Contact already verified' },
        { status: 400 }
      );
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newToken = generateToken(32);

    await prisma.$transaction(async (tx) => {
      await tx.contactInvitation.updateMany({
        where: { contactId: id, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });

      await tx.contactInvitation.create({
        data: {
          inviterId: (session.user as any).id,
          contactId: id,
          email: contact.email,
          token: newToken,
          expiresAt,
        },
      });

      await tx.emergencyContact.update({
        where: { id },
        data: { verificationToken: newToken },
      });
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const verificationUrl =
      `${appUrl}/api/contacts/verify?token=${encodeURIComponent(newToken)}`;

    const emailResult = await sendEmail({
      to: contact.email,
      subject: 'Verify your SafeLink emergency contact',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; background: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: 40px auto; background: white; padding: 32px; border: 1px solid #e5e7eb; border-radius: 12px;">
            
            <h1 style="color: #dc2626; margin-top: 0;">
              SafeLink Emergency Contact
            </h1>

            <p>
              Hi ${contact.name},
            </p>

            <p>
              You have been added as an emergency contact on SafeLink.
            </p>

            <p>
              Please verify your email address by clicking the button below.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a
                href="${verificationUrl}"
                style="display: inline-block; background: #dc2626; color: white; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;"
              >
                Verify Emergency Contact
              </a>
            </div>

            <p>
              This verification link expires in 7 days.
            </p>

            <p>
              If you did not expect this invitation, you can safely ignore this email.
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

            <p style="font-size: 12px; color: #6b7280;">
              SafeLink - Human Safety Platform
            </p>

          </div>
        </body>
        </html>
      `,
      text: `
Hi ${contact.name},

You have been added as an emergency contact on SafeLink.

Please verify your email address using this link:

${verificationUrl}

This verification link expires in 7 days.

If you did not expect this invitation, you can safely ignore this email.

SafeLink - Human Safety Platform
      `.trim(),
    });

    if (!emailResult.success) {
      console.error(
        'Failed to send verification email:',
        emailResult.error
      );

      return NextResponse.json(
        {
          error:
            'Invitation created, but verification email could not be sent',
          details: emailResult.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent',
    });
  } catch (error) {
    console.error('Resend invitation error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}