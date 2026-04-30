// app/api/auth/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createGroqClient } from '@/lib/groq-client';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey || !apiKey.startsWith('gsk_')) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 400 }
      );
    }

    // Validate the API key by making a test request
    const groqClient = createGroqClient(apiKey);
    const isValid = await groqClient.validateApiKey();

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Store or update user in database
    const user = await prisma.user.upsert({
      where: { groqApiKey: apiKey },
      update: { updatedAt: new Date() },
      create: { groqApiKey: apiKey },
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
