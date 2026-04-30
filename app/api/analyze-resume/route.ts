// app/api/analyze-resume/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createGroqClient } from '@/lib/groq-client';
import prisma from '@/lib/db';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-Groq-API-Key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { groqApiKey: apiKey },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Extract text from file based on type
    let resumeText = '';
    const buffer = Buffer.from(await file.arrayBuffer());

    if (file.type === 'application/pdf') {
      const data = await pdf(buffer);
      resumeText = data.text;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      resumeText = result.value;
    } else if (file.type === 'text/plain') {
      resumeText = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Could not extract text from resume' },
        { status: 400 }
      );
    }

    // Parse resume with Groq
    const groqClient = createGroqClient(apiKey);
    const parsedData = await groqClient.parseResume(resumeText);

    // Save resume to database
    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        fileName: file.name,
        content: resumeText,
        parsedData: parsedData,
      },
    });

    return NextResponse.json({
      resumeId: resume.id,
      fileName: file.name,
      parsedData: parsedData,
    });
  } catch (error) {
    console.error('Resume analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze resume' },
      { status: 500 }
    );
  }
}
