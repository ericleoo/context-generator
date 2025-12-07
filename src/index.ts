#!/usr/bin/env node

import { Command } from 'commander';
import { glob } from 'glob';
import { readFile, access, stat, readdir } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

// Rename readFile for binary reading to avoid confusion
const readBinaryFile = readFile;

const program = new Command();

program
  .name('generate-context')
  .description('Concatenate contents of multiple files, globs, or directories with filename headers')
  .version('1.0.0')
  .argument('[paths...]', 'File names, globs, or directories to concatenate')
  .option('--include-binary', 'Include binary files in the output (not recommended)', false)
  .option('--exclude-binary', 'Exclude binary files from the output (default behavior)', true)

  .action(async (paths: string[], options: { includeBinary?: boolean, excludeBinary?: boolean }) => {
    if (paths.length === 0) {
      console.error('Error: No paths specified');
      process.exit(1);
    }

    try {
      const allFiles = await expandFiles(paths, true);
      
      if (allFiles.length === 0) {
        console.error('Error: No matching files found');
        process.exit(1);
      }

      // Filter out binary files unless explicitly requested
      const shouldIncludeBinary = options.includeBinary === true;
      const textFiles = shouldIncludeBinary ? allFiles : await filterTextFiles(allFiles);
      
      if (textFiles.length === 0) {
        console.error('Error: No text files found');
        process.exit(1);
      }

      if (!shouldIncludeBinary && textFiles.length < allFiles.length) {
        const skippedCount = allFiles.length - textFiles.length;
        console.error(`Skipped ${skippedCount} binary file(s). Use --include-binary to include them.`);
      }

      await generateContext(textFiles);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();

/**
 * Detects if a file is binary by examining its content
 * @param filePath Path to the file to check
 * @returns Promise<boolean> True if the file appears to be binary
 */
async function isBinaryFile(filePath: string): Promise<boolean> {
  try {
    // Read first 8KB of the file to check for binary content
    const buffer = await readFile(filePath) as Buffer;
    
    if (buffer.length === 0) {
      return false; // Empty files are treated as text
    }

    // Check for null bytes - common indicator of binary files
    for (let i = 0; i < Math.min(buffer.length, 8192); i++) {
      if (buffer[i] === 0) {
        return true;
      }
    }

    // Check ratio of printable characters vs total characters
    let printableCount = 0;
    const checkLength = Math.min(buffer.length, 1024);
    
    for (let i = 0; i < checkLength; i++) {
      const byte = buffer[i];
      // Check for common printable characters (ASCII 32-126, tab, newline, carriage return)
      if (
        (byte >= 32 && byte <= 126) || 
        byte === 9 || // tab
        byte === 10 || // newline
        byte === 13    // carriage return
      ) {
        printableCount++;
      }
    }

    // If less than 80% of characters are printable, likely binary
    const printableRatio = printableCount / checkLength;
    return printableRatio < 0.8;
  } catch (error) {
    // If we can't read the file, assume it's not binary to be safe
    return false;
  }
}

/**
 * Filters a list of files to only include text files
 * @param files List of file paths to filter
 * @returns Promise<string[]> List of text files only
 */
async function filterTextFiles(files: string[]): Promise<string[]> {
  const textFiles: string[] = [];
  
  for (const file of files) {
    const isBinary = await isBinaryFile(file);
    if (!isBinary) {
      textFiles.push(file);
    }
  }
  
  return textFiles;
}

async function expandFiles(patterns: string[], recursive: boolean = true): Promise<string[]> {
  const files: string[] = [];
  
  for (const pattern of patterns) {
    try {
      // First check if the pattern is a directory
      if (await isDirectory(pattern)) {
        const dirFiles = await findFilesInDirectory(pattern, recursive);
        files.push(...dirFiles);
      } else {
        // Try glob expansion first
        const matches = await glob(pattern, { cwd: process.cwd() });
        if (matches.length > 0) {
          files.push(...matches);
        } else {
          // If glob fails, treat as literal file path
          if (await fileExists(pattern)) {
            files.push(pattern);
          }
        }
      }
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

async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function findFilesInDirectory(dirPath: string, recursive: boolean = true): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && recursive) {
        // Recursively process subdirectories
        const subDirFiles = await findFilesInDirectory(fullPath, recursive);
        files.push(...subDirFiles);
      } else if (entry.isFile()) {
        // Add file to the list
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error instanceof Error ? error.message : 'Unknown error');
  }
  
  return files;
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