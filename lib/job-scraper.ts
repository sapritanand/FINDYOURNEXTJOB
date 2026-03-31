// lib/job-scraper.ts

import axios from 'axios';
import * as cheerio from 'cheerio';
import he from 'he';
import { Job } from './types';
import { fixMojibake, removeBrokenEmoji, normalizeUnicode, removeSpamText, cleanJobDescription } from './text-cleaner';

// Clean text: decode HTML entities and fix mojibake (for titles, company names, etc.)
function cleanText(text: string): string {
  if (!text) return '';
  let result = he.decode(text);
  result = fixMojibake(result);
  result = removeBrokenEmoji(result);
  result = normalizeUnicode(result);
  return result.trim();
}

// Clean description: full HTML strip + entity decode + mojibake fix + spam removal
function cleanDescription(html: string): string {
  if (!html) return 'Job description available on source website.';

  // Use 'he' for robust HTML entity decoding first
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6]|li|ul|ol|tr|section|article|header|footer|blockquote)\b[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, ' ');

  text = he.decode(text);
  text = fixMojibake(text);
  text = removeBrokenEmoji(text);
  text = normalizeUnicode(text);
  text = removeSpamText(text);

  // Normalize whitespace
  text = text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (text.length < 15) {
    return 'Job description available on source website.';
  }

  return text;
}

export async function scrapeRemoteOK(): Promise<Job[]> {
  try {
    const response = await axios.get('https://remoteok.com/api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
      },
    });

    const jobs = response.data
      .filter((job: any) => job.position) // Filter out the first item (metadata)
      .filter((job: any) => {
        // Filter for AI/ML jobs
        const searchTerms = ['machine learning', 'ml', 'ai', 'artificial intelligence', 'data scientist', 'nlp', 'deep learning', 'pytorch', 'tensorflow'];
        const combinedText = `${job.position} ${job.description || ''}`.toLowerCase();
        return searchTerms.some(term => combinedText.includes(term));
      })
      .slice(0, 20) // Limit to 20 jobs
      .map((job: any) => ({
        title: cleanText(job.position),
        company: cleanText(job.company),
        location: job.location || 'Remote',
        description: cleanDescription(job.description || ''),
        url: `https://remoteok.com/remote-jobs/${job.slug}`,
        salary: job.salary_min && job.salary_max 
          ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
          : undefined,
        tags: job.tags || [],
        source: 'remoteok',
      }));

    return jobs;
  } catch (error) {
    console.error('Error scraping RemoteOK:', error);
    return [];
  }
}

export async function scrapeWeWorkRemotely(): Promise<Job[]> {
  try {
    const response = await axios.get('https://weworkremotely.com/remote-jobs/search?term=machine+learning', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
      },
    });

    const $ = cheerio.load(response.data);
    const jobs: Job[] = [];

    $('.feature, article').each((_, element) => {
      const $el = $(element);
      
      const title = $el.find('.title').text().trim();
      const company = $el.find('.company').text().trim();
      const url = $el.find('a').attr('href');
      
      if (title && company && url) {
        jobs.push({
          title: cleanText(title),
          company: cleanText(company),
          location: 'Remote',
          description: cleanDescription($el.find('.region').text().trim() || 'No description available'),
          url: url.startsWith('http') ? url : `https://weworkremotely.com${url}`,
          tags: [],
          source: 'weworkremotely',
        });
      }
    });

    return jobs.slice(0, 20);
  } catch (error) {
    console.error('Error scraping WeWorkRemotely:', error);
    return [];
  }
}

export async function scrapeRematch(): Promise<Job[]> {
  try {
    // Rematch.jobs API endpoint
    const response = await axios.get('https://rematch.jobs/api/jobs', {
      params: {
        search: 'machine learning OR AI OR data scientist',
        limit: 20,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobBot/1.0)',
      },
    });

    const jobs = response.data.jobs?.map((job: any) => ({
      title: cleanText(job.title),
      company: cleanText(job.company_name),
      location: job.location || 'Remote',
      description: cleanDescription(job.description || job.summary || ''),
      url: job.url || job.apply_url,
      salary: job.salary_range,
      tags: job.tags || [],
      source: 'rematch',
    })) || [];

    return jobs;
  } catch (error) {
    console.error('Error scraping Rematch:', error);
    return [];
  }
}

export async function scrapeAllJobs(): Promise<Job[]> {
  console.log('Starting job scraping...');
  
  const [remoteOKJobs, weWorkRemotelyJobs, rematchJobs] = await Promise.allSettled([
    scrapeRemoteOK(),
    scrapeWeWorkRemotely(),
    scrapeRematch(),
  ]);

  const allJobs: Job[] = [];

  if (remoteOKJobs.status === 'fulfilled') {
    allJobs.push(...remoteOKJobs.value);
  }
  if (weWorkRemotelyJobs.status === 'fulfilled') {
    allJobs.push(...weWorkRemotelyJobs.value);
  }
  if (rematchJobs.status === 'fulfilled') {
    allJobs.push(...rematchJobs.value);
  }

  console.log(`Scraped ${allJobs.length} total jobs`);
  return allJobs;
}

// Helper function to extract job URLs from text
export function extractJobURLs(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}
