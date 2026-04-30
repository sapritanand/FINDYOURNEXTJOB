// app/api/generate-cover-letter/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createGroqClient } from '@/lib/groq-client';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-Groq-API-Key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const { applicationId } = await request.json();

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID required' },
        { status: 400 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { groqApiKey: apiKey },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get application with job and resume
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        resume: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify application belongs to user
    if (application.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if cover letter already exists
    if (application.coverLetter) {
      return NextResponse.json({
        coverLetter: application.coverLetter,
        alreadyExists: true,
      });
    }

    // Generate cover letter with Groq
    const groqClient = createGroqClient(apiKey);
    const coverLetter = await groqClient.generateCoverLetter(
      application.job.description,
      application.resume.parsedData,
      application.job.company,
      application.job.title
    );

    // Update application with cover letter
    await prisma.application.update({
      where: { id: applicationId },
      data: { coverLetter },
    });

    return NextResponse.json({
      coverLetter,
      alreadyExists: false,
    });
  } catch (error) {
    console.error('Cover letter generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate cover letter' },
      { status: 500 }
    );
  }
}
