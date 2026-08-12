import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if already subscribed
    const existingSubscriber = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existingSubscriber) {
      if (existingSubscriber.isActive) {
        return NextResponse.json({ message: 'You are already subscribed to the newsletter!' }, { status: 200 });
      } else {
        // Reactivate subscription if it was inactive
        await prisma.newsletterSubscriber.update({
          where: { email },
          data: { isActive: true },
        });
        return NextResponse.json({ message: 'Welcome back! Your subscription has been reactivated.' }, { status: 200 });
      }
    }

    // Create new subscriber
    await prisma.newsletterSubscriber.create({
      data: {
        email,
        isActive: true,
      },
    });

    return NextResponse.json({ message: 'Thank you for subscribing to our newsletter!' }, { status: 201 });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again later.' }, { status: 500 });
  }
}
