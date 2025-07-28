/**
 * index.js - Express server for dynamic subtitle rendering
 *
 * Handles:
 * - Subtitle creation via ASS styling
 * - FFmpeg rendering (modularized)
 * - Whisper transcription
 * - Cloudinary video delivery
 * - Job ID returns for polling (immediate response)
 * - Cross-origin and logging support
 * - Non-blocking background rendering (Make.com safe)
 */

// ────────────────────────────────────────────────
// 1. IMPORTS AND DEPENDENCIES
// ────────────────────────────────────────────────
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import
