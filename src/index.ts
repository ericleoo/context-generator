#!/usr/bin/env node

import { Command } from 'commander';
import { glob } from 'glob';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

const program = new Command();

program
  .name('generate-context')
  .description('Concatenate contents of multiple files with filename headers')
  .version('1.0.0')
  .argument('[files...]', 'File names or globs to concatenate')
  .action(async (files: string[]) => {
    if (files.length === 0) {
      console.error('Error: No files specified');
      process.exit(1);
    }

    try {
      const allFiles = await expandFiles(files);
      
      if (allFiles.length === 0) {
        console.error('Error: No matching files found');
        process.exit(1);
      }

      await generateContext(allFiles);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();

async function expandFiles(patterns: string[]): Promise<string[]> {
  const files: string[] = [];
  
  for (const pattern of patterns) {
    try {
      const matches = await glob(pattern, { cwd: process.cwd() });
      files.push(...matches);
    } catch (error) {
      // If glob fails, treat as literal file path
      if (await fileExists(pattern)) {
        files.push(pattern);
      }
    }
  }
  
  return [...new Set(files)]; // Remove duplicates
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function generateContext(files: string[]): Promise<void> {
  for (const file of files) {
    try {
      const content = await readFile(file, 'utf-8');
      const displayPath = path.relative(process.cwd(), file);
      
      console.log(`${displayPath}:`);
      console.log('```');
      console.log(content);
      console.log('```');
      
      // Add blank line between files (but not after the last one)
      if (file !== files[files.length - 1]) {
        console.log();
      }
    } catch (error) {
      console.error(`Error reading ${file}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }
}