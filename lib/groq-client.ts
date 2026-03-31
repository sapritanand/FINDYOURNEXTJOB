// lib/groq-client.ts

import Groq from 'groq-sdk';

export class GroqClient {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({
      apiKey: apiKey,
    });
  }

  async chat(messages: { role: string; content: string }[], model: string = 'llama-3.3-70b-versatile') {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      );
      
      const apiPromise = this.client.chat.completions.create({
        messages: messages as any,
        model: model,
        temperature: 0.7,
        max_tokens: 2048,
      });

      const response = await Promise.race([apiPromise, timeoutPromise]) as any;
      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('Groq API error:', error.message || error);
      throw new Error(`Groq API failed: ${error.message || 'Unknown error'}`);
    }
  }

  async parseResume(resumeText: string) {
    const prompt = `You are an expert resume parser. Extract structured information from the following resume and return ONLY valid JSON (no markdown, no explanation).

Resume:
${resumeText}

Return JSON with this exact structure:
{
  "name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "skills": ["array of skills"],
  "experience": [
    {
      "company": "string",
      "title": "string",
      "duration": "string",
      "description": "string"
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "year": "string"
    }
  ],
  "summary": "string or null"
}`;

    const response = await this.chat([
      { role: 'user', content: prompt }
    ]);

    // Clean response to ensure valid JSON
    let cleanedResponse = response.trim();
    
    // Remove ALL markdown code fences more aggressively
    // This handles: ```json, ```, ``` at start, ``` at end
    cleanedResponse = cleanedResponse
      .replace(/^```(?:json)?\s*\n?/i, '')  // Remove opening ```json or ```
      .replace(/\n?```\s*$/g, '')           // Remove closing ```
      .trim();

    try {
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to parse JSON:', cleanedResponse);
      console.error('Parse error details:', error);
      
      // Try one more cleanup: remove all backticks
      const finalAttempt = cleanedResponse.replace(/```/g, '').trim();
      try {
        return JSON.parse(finalAttempt);
      } catch (finalError) {
        console.error('Final parse attempt failed');
        throw new Error('Failed to parse resume data');
      }
    }
  }

  async matchJobToResume(jobDescription: string, resumeData: any) {
    // Validate inputs
    if (!jobDescription || typeof jobDescription !== 'string') {
      throw new Error('Invalid job description');
    }
    
    if (!resumeData || typeof resumeData !== 'object') {
      throw new Error('Invalid resume data');
    }

    // Truncate job description if too long to avoid token limits
    const maxDescriptionLength = 2000;
    const truncatedDescription = jobDescription.length > maxDescriptionLength
      ? jobDescription.substring(0, maxDescriptionLength) + '...'
      : jobDescription;
    
    // Safely stringify resume data, handling potential circular references
    let resumeDataString;
    try {
      resumeDataString = JSON.stringify(resumeData, null, 2);
    } catch (stringifyError) {
      console.error('Error stringify resume data:', stringifyError);
      // Create a simplified version
      resumeDataString = JSON.stringify({
        skills: resumeData.skills || [],
        experience: resumeData.experience || [],
        education: resumeData.education || []
      }, null, 2);
    }

    const prompt = `You are an expert career advisor. Analyze the fit between this job and resume. Return ONLY valid JSON.

Job Description:
${truncatedDescription}

Resume Data:
${resumeDataString}

Return JSON with this exact structure:
{
  "score": 85,
  "strengths": ["array of 3-5 specific strengths"],
  "gaps": ["array of 2-4 specific gaps or areas for improvement"],
  "recommendations": ["array of 3-5 actionable recommendations"],
  "keySkillsMatch": {
    "matched": ["array of required skills the candidate has"],
    "missing": ["array of required skills the candidate lacks"]
  }
}

Score should be 0-100 based on overall fit.`;

    const response = await this.chat([
      { role: 'user', content: prompt }
    ]);

    // Clean response to ensure valid JSON
    let cleanedResponse = response.trim();
    
    // Remove ALL markdown code fences more aggressively
    cleanedResponse = cleanedResponse
      .replace(/^```(?:json)?\s*\n?/i, '')  // Remove opening ```json or ```
      .replace(/\n?```\s*$/g, '')           // Remove closing ```
      .trim();

    try {
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Failed to parse match analysis:', cleanedResponse);
      console.error('Parse error details:', error);
      
      // Try one more cleanup: remove all backticks
      const finalAttempt = cleanedResponse.replace(/```/g, '').trim();
      try {
        return JSON.parse(finalAttempt);
      } catch (finalError) {
        console.error('Final parse attempt failed, returning fallback match');
        // Return a fallback match result rather than throwing
        return {
          score: 50,
          strengths: ['Unable to analyze - please try again'],
          gaps: ['Analysis failed'],
          recommendations: ['Manually review the job description'],
          keySkillsMatch: {
            matched: [],
            missing: []
          }
        };
      }
    }
  }

  async generateCoverLetter(jobDescription: string, resumeData: any, companyName: string, jobTitle: string) {
    const prompt = `You are an expert cover letter writer. Write a compelling, personalized cover letter for this job application.

Job Title: ${jobTitle}
Company: ${companyName}

Job Description:
${jobDescription}

Candidate Resume:
${JSON.stringify(resumeData, null, 2)}

Write a professional cover letter that:
1. Opens with enthusiasm for the specific role
2. Highlights 2-3 most relevant experiences/skills
3. Shows understanding of the company/role
4. Closes with a call to action
5. Is concise (300-400 words)

Return ONLY the cover letter text, no JSON, no markdown formatting.`;

    const response = await this.chat([
      { role: 'user', content: prompt }
    ], 'llama-3.3-70b-versatile'); // Use larger model for better writing

    return response.trim();
  }

  async validateApiKey(): Promise<boolean> {
    try {
      await this.chat([
        { role: 'user', content: 'Hello' }
      ]);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export function createGroqClient(apiKey: string) {
  return new GroqClient(apiKey);
}
