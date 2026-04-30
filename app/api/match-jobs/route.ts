// app/api/match-jobs/route.ts

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

    // Validate API key format (Groq keys start with gsk_)
    if (!apiKey.startsWith('gsk_')) {
      return NextResponse.json(
        { error: 'Invalid Groq API key format' },
        { status: 401 }
      );
    }

    const { resumeId, jobId } = await request.json();

    console.log('Match request:', { resumeId, jobId });

    if (!resumeId || !jobId) {
      return NextResponse.json(
        { error: 'Resume ID and Job ID required' },
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

    // Get resume and job
    const [resume, job] = await Promise.all([
      prisma.resume.findUnique({ where: { id: resumeId } }),
      prisma.job.findUnique({ where: { id: jobId } }),
    ]);

    console.log('Retrieved resume:', !!resume, 'and job:', !!job);

    if (!resume || !job) {
      return NextResponse.json(
        { error: 'Resume or job not found' },
        { status: 404 }
      );
    }

    // Verify resume belongs to user
    if (resume.userId !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if application already exists
    const existingApplication = await prisma.application.findFirst({
      where: {
        userId: user.id,
        jobId: jobId,
        resumeId: resumeId,
      },
    });

    if (existingApplication) {
      return NextResponse.json({
        applicationId: existingApplication.id,
        matchScore: existingApplication.matchScore,
        matchAnalysis: existingApplication.matchAnalysis,
        alreadyExists: true,
      });
    }

    // Perform matching with Groq
    console.log('Starting Groq matching for job:', job.title);
    const groqClient = createGroqClient(apiKey);
    
    let matchAnalysis;
    try {
      matchAnalysis = await groqClient.matchJobToResume(
        job.description,
        resume.parsedData
      );
      console.log('Groq matching completed with score:', matchAnalysis.score);
    } catch (groqError: any) {
      console.error('Groq matching error:', groqError);
      return NextResponse.json(
        { 
          error: 'Failed to analyze job match with AI',
          details: groqError.message || 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Validate match analysis response
    if (!matchAnalysis || typeof matchAnalysis.score !== 'number') {
      console.error('Invalid match analysis format:', matchAnalysis);
      return NextResponse.json(
        { error: 'Invalid match analysis response from AI' },
        { status: 500 }
      );
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        userId: user.id,
        jobId: jobId,
        resumeId: resumeId,
        matchScore: matchAnalysis.score,
        matchAnalysis: matchAnalysis,
        status: 'pending',
      },
    });

    return NextResponse.json({
      applicationId: application.id,
      matchScore: matchAnalysis.score,
      matchAnalysis: matchAnalysis,
      alreadyExists: false,
    });
  } catch (error: any) {
    console.error('Match error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to match job',
        details: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// Get all matches for a user
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-Groq-API-Key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { groqApiKey: apiKey },
      include: {
        applications: {
          include: {
            job: true,
            resume: true,
          },
          orderBy: {
            matchScore: 'desc',
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      applications: user.applications,
    });
  } catch (error) {
    console.error('Get matches error:', error);
    return NextResponse.json(
      { error: 'Failed to get matches' },
      { status: 500 }
    );
  }
}
