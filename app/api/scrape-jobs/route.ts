// app/api/scrape-jobs/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { scrapeAllJobs } from '@/lib/job-scraper';
import prisma from '@/lib/db';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs'; // Use Node.js runtime for web scraping
export const maxDuration = 60; // Allow up to 60 seconds for scraping

export async function GET(request: NextRequest) {
  try {
    // Check cache first (cache for 1 hour)
    const cached = await kv.get('jobs:latest');
    if (cached) {
      return NextResponse.json({ jobs: cached, fromCache: true });
    }

    // Scrape fresh jobs
    const scrapedJobs = await scrapeAllJobs();

    // Store jobs in database
    const savedJobs = [];
    for (const job of scrapedJobs) {
      try {
        const savedJob = await prisma.job.create({
          data: {
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            url: job.url,
            salary: job.salary,
            tags: job.tags,
            source: job.source,
          },
        });
        savedJobs.push(savedJob);
      } catch (error) {
        console.error('Error saving job:', error);
        // Continue with other jobs
      }
    }

    // Cache the results
    await kv.set('jobs:latest', savedJobs, { ex: 3600 }); // 1 hour expiry

    return NextResponse.json({
      jobs: savedJobs,
      count: savedJobs.length,
      fromCache: false,
    });
  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape jobs' },
      { status: 500 }
    );
  }
}

// Endpoint to refresh cache
export async function POST(request: NextRequest) {
  try {
    // Clear cache
    await kv.del('jobs:latest');

    // Trigger new scrape
    const scrapedJobs = await scrapeAllJobs();

    // Store in database
    const savedJobs = [];
    for (const job of scrapedJobs) {
      try {
        const savedJob = await prisma.job.create({
          data: {
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            url: job.url,
            salary: job.salary,
            tags: job.tags,
            source: job.source,
          },
        });
        savedJobs.push(savedJob);
      } catch (error) {
        console.error('Error saving job:', error);
      }
    }

    // Update cache
    await kv.set('jobs:latest', savedJobs, { ex: 3600 });

    return NextResponse.json({
      jobs: savedJobs,
      count: savedJobs.length,
      refreshed: true,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh jobs' },
      { status: 500 }
    );
  }
}
