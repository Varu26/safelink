import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateToken, isValidEmail } from '@/lib/utils';
import { z } from 'zod';

const createContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  relationship: z.string().max(50).optional(),
});

function getUserId(session: any): string | null {
  return (session?.user as any)?.id;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const contacts = await prisma.emergencyContact.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        invitations: {
          where: { status: 'PENDING' },
          select: {
            id: true,
            token: true,
            expiresAt: true,
          },
        },
      },
    });

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Get contacts error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = createContactSchema.parse(body);

    if (!isValidEmail(validated.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const email = validated.email.trim().toLowerCase();

    const existingContact = await prisma.emergencyContact.findFirst({
      where: {
        userId,
        email,
      },
    });

    if (existingContact) {
      return NextResponse.json(
        { error: 'Contact with this email already exists' },
        { status: 400 }
      );
    }

    const verificationToken = generateToken(32);
    const invitationToken = generateToken(32);

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    const contact = await prisma.emergencyContact.create({
      data: {
        userId,
        name: validated.name,
        email,
        phone: validated.phone,
        relationship: validated.relationship,
        verificationToken,
      },
    });

    const invitation = await prisma.contactInvitation.create({
      data: {
        inviterId: userId,
        contactId: contact.id,
        email,
        token: invitationToken,
        expiresAt,
      },
    });

    /*
     * Send verification email using Resend
     */
    const resendApiKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      'http://localhost:3000';

    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured');

      return NextResponse.json(
        {
          error:
            'Contact created, but email service is not configured. Add RESEND_API_KEY to your environment variables.',
        },
        { status: 500 }
      );
    }

    if (!emailFrom) {
      console.error('EMAIL_FROM is not configured');

      return NextResponse.json(
        {
          error:
            'Contact created, but EMAIL_FROM is not configured.',
        },
        { status: 500 }
      );
    }

    const verificationUrl =
      `${appUrl}/api/contacts/verify?token=${encodeURIComponent(
        invitation.token
      )}`;

    const resendResponse = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [email],
          subject: 'SafeLink Emergency Contact Verification',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>SafeLink Emergency Contact Verification</h2>

              <p>Hello ${validated.name},</p>

              <p>
                You have been added as an emergency contact on SafeLink.
              </p>

              <p>
                Please click the button below to verify your email address.
              </p>

              <p style="margin: 30px 0;">
                <a
                  href="${verificationUrl}"
                  style="
                    display: inline-block;
                    padding: 12px 24px;
                    background: #2563eb;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                  "
                >
                  Verify Email
                </a>
              </p>

              <p>
                This verification link expires in 7 days.
              </p>

              <p>
                If you did not expect this invitation, you can safely ignore
                this email.
              </p>

              <p>
                — SafeLink
              </p>
            </div>
          `,
        }),
      }
    );

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();

      console.error(
        'Resend email error:',
        resendResponse.status,
        resendError
      );

      return NextResponse.json(
        {
          error:
            'Contact was created, but the verification email could not be sent.',
        },
        { status: 500 }
      );
    }

    const resendData = await resendResponse.json();

    console.log('Verification email sent:', resendData);

    return NextResponse.json(
      {
        contact,
        invitation,
        emailSent: true,
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

    console.error('Create contact error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}