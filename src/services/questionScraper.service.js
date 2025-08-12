const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const winston = require('winston');
const { Quiz, QuizQuestion, QuizAnswer } = require('../models');
const { sequelize } = require('../models');
const scraperConfig = require('../config/scraper.config');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: 'question-scraper.log' }),
    new winston.transports.Console()
  ]
});

class QuestionScraperService {
  constructor() {
    this.sources = [
      {
        name: 'JEE Main Questions',
        url: 'https://www.embibe.com/exams/jee-main-previous-year-question-papers/',
        type: 'static'
      },
      {
        name: 'JEE Advanced Questions',
        url: 'https://www.vedantu.com/jee/jee-advanced-previous-year-question-papers',
        type: 'static'
      },
      {
        name: 'Physics Questions',
        url: 'https://www.toppr.com/guides/jee-main-and-advanced/physics/',
        type: 'dynamic'
      }
    ];
  }

  /**
   * Main method to scrape questions from all sources
   */
  async scrapeAllQuestions() {
    logger.info('Starting question scraping process...');
    
    try {
      const allQuestions = [];
      
      for (const source of this.sources) {
        logger.info(`Scraping from: ${source.name}`);
        
        try {
          let questions;
          if (source.type === 'static') {
            questions = await this.scrapeStaticContent(source.url);
          } else {
            questions = await this.scrapeDynamicContent(source.url);
          }
          
          if (questions && questions.length > 0) {
            allQuestions.push(...questions);
            logger.info(`Successfully scraped ${questions.length} questions from ${source.name}`);
          }
        } catch (error) {
          logger.error(`Error scraping from ${source.name}: ${error.message}`);
        }
      }

      if (allQuestions.length > 0) {
        await this.saveQuestionsToDatabase(allQuestions);
        logger.info(`Total questions scraped and saved: ${allQuestions.length}`);
      } else {
        logger.warn('No questions were scraped from any source');
      }

      return allQuestions;
    } catch (error) {
      logger.error(`Error in scraping process: ${error.message}`);
      throw error;
    }
  }

  /**
   * Scrape questions from static HTML content
   */
  async scrapeStaticContent(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const questions = [];

      // Generic question extraction patterns
      const questionSelectors = [
        '.question-container',
        '.mcq-question',
        '.question-block',
        '[class*="question"]',
        '.quiz-question'
      ];

      for (const selector of questionSelectors) {
        $(selector).each((index, element) => {
          const questionData = this.extractQuestionData($, element);
          if (questionData) {
            questions.push(questionData);
          }
        });

        if (questions.length > 0) break; // Stop if we found questions with this selector
      }

      // Fallback: Look for common patterns in text
      if (questions.length === 0) {
        questions.push(...this.extractQuestionsFromText($.text()));
      }

      return questions;
    } catch (error) {
      logger.error(`Error scraping static content from ${url}: ${error.message}`);
      return [];
    }
  }

  /**
   * Scrape questions from dynamic content using Puppeteer
   */
  async scrapeDynamicContent(url) {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for content to load
      await page.waitForTimeout(3000);

      const content = await page.content();
      const $ = cheerio.load(content);
      const questions = [];

      // Extract questions using similar logic as static content
      const questionSelectors = [
        '.question-container',
        '.mcq-question',
        '.question-block',
        '[class*="question"]',
        '.quiz-question'
      ];

      for (const selector of questionSelectors) {
        $(selector).each((index, element) => {
          const questionData = this.extractQuestionData($, element);
          if (questionData) {
            questions.push(questionData);
          }
        });

        if (questions.length > 0) break;
      }

      return questions;
    } catch (error) {
      logger.error(`Error scraping dynamic content from ${url}: ${error.message}`);
      return [];
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Extract question data from a DOM element
   */
  extractQuestionData($, element) {
    try {
      const $element = $(element);
      
      // Extract question text
      let questionText = $element.find('.question-text, .question, h3, h4, p').first().text().trim();
      if (!questionText) {
        questionText = $element.text().trim().split('\n')[0];
      }

      if (!questionText || questionText.length < 10) {
        return null;
      }

      // Extract answers
      const answers = [];
      const answerSelectors = [
        '.option',
        '.answer-option',
        '.choice',
        '[class*="option"]',
        'li'
      ];

      for (const answerSelector of answerSelectors) {
        $element.find(answerSelector).each((index, answerElement) => {
          const answerText = $(answerElement).text().trim();
          if (answerText && answerText.length > 0 && answerText.length < 200) {
            const isCorrect = $(answerElement).hasClass('correct') || 
                            $(answerElement).hasClass('right') ||
                            $(answerElement).find('.correct, .right').length > 0;
            
            answers.push({
              answerText: answerText.replace(/^[A-D]\)\s*/, ''), // Remove option labels
              isCorrect: isCorrect
            });
          }
        });

        if (answers.length > 0) break;
      }

      // If no answers found, create default multiple choice options
      if (answers.length === 0) {
        answers.push(
          { answerText: 'Option A', isCorrect: true },
          { answerText: 'Option B', isCorrect: false },
          { answerText: 'Option C', isCorrect: false },
          { answerText: 'Option D', isCorrect: false }
        );
      }

      // Determine subject based on content
      const subject = this.determineSubject(questionText);

      return {
        questionText,
        questionType: 'single_choice',
        points: 4, // Standard JEE marking
        subject,
        difficulty: 'medium',
        answers
      };
    } catch (error) {
      logger.error(`Error extracting question data: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract questions from plain text using patterns
   */
  extractQuestionsFromText(text) {
    const questions = [];
    
    // Pattern to match question-like structures
    const questionPattern = /(?:Q\d*\.?\s*|Question\s*\d*\.?\s*)(.*?)(?=Q\d*\.?\s*|Question\s*\d*\.?\s*|$)/gis;
    const matches = text.match(questionPattern);

    if (matches) {
      matches.forEach(match => {
        const cleanMatch = match.trim();
        if (cleanMatch.length > 20 && cleanMatch.length < 1000) {
          questions.push({
            questionText: cleanMatch.replace(/^(Q\d*\.?\s*|Question\s*\d*\.?\s*)/, ''),
            questionType: 'single_choice',
            points: 4,
            subject: this.determineSubject(cleanMatch),
            difficulty: 'medium',
            answers: [
              { answerText: 'Option A', isCorrect: true },
              { answerText: 'Option B', isCorrect: false },
              { answerText: 'Option C', isCorrect: false },
              { answerText: 'Option D', isCorrect: false }
            ]
          });
        }
      });
    }

    return questions.slice(0, 50); // Limit to 50 questions per scrape
  }

  /**
   * Determine subject based on question content
   */
  determineSubject(questionText) {
    const text = questionText.toLowerCase();
    
    if (text.includes('force') || text.includes('velocity') || text.includes('acceleration') || 
        text.includes('energy') || text.includes('momentum') || text.includes('wave')) {
      return 'Physics';
    } else if (text.includes('molecule') || text.includes('atom') || text.includes('reaction') || 
               text.includes('compound') || text.includes('element') || text.includes('bond')) {
      return 'Chemistry';
    } else if (text.includes('function') || text.includes('derivative') || text.includes('integral') || 
               text.includes('equation') || text.includes('matrix') || text.includes('probability')) {
      return 'Mathematics';
    }
    
    return 'General';
  }

  /**
   * Save scraped questions to database
   */
  async saveQuestionsToDatabase(questions) {
    const transaction = await sequelize.transaction();
    
    try {
      // Create a new mock test for scraped questions
      const mockTest = await Quiz.create({
        lessonId: null,
        title: `JEE Questions - ${new Date().toISOString().split('T')[0]}`,
        description: 'Auto-generated mock test from web scraping',
        timeLimit: 180, // 3 hours
        passingScore: 33, // 33% for JEE
        category: 'Mixed',
        difficulty: 'medium'
      }, { transaction });

      // Save questions and answers
      for (let i = 0; i < questions.length; i++) {
        const questionData = questions[i];
        
        const question = await QuizQuestion.create({
          quizId: mockTest.id,
          questionText: questionData.questionText,
          questionType: questionData.questionType,
          points: questionData.points,
          position: i
        }, { transaction });

        // Save answers
        for (const answerData of questionData.answers) {
          await QuizAnswer.create({
            questionId: question.id,
            answerText: answerData.answerText,
            isCorrect: answerData.isCorrect
          }, { transaction });
        }
      }

      await transaction.commit();
      logger.info(`Successfully saved ${questions.length} questions to database`);
      
      return mockTest;
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error saving questions to database: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clean old questions (older than 30 days)
   */
  async cleanOldQuestions() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldQuizzes = await Quiz.findAll({
        where: {
          lessonId: null,
          title: {
            [require('sequelize').Op.like]: 'JEE Questions -%'
          },
          createdAt: {
            [require('sequelize').Op.lt]: thirtyDaysAgo
          }
        }
      });

      for (const quiz of oldQuizzes) {
        await quiz.destroy();
      }

      logger.info(`Cleaned ${oldQuizzes.length} old question sets`);
    } catch (error) {
      logger.error(`Error cleaning old questions: ${error.message}`);
    }
  }
}

module.exports = new QuestionScraperService();