#!/usr/bin/env node

import { Command } from 'commander';
import { glob } from 'glob';
import { readFile, access, stat, readdir } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';

const program = new Command();

program
  .name('generate-context')
  .description('Concatenate contents of multiple files, globs, or directories with filename headers')
  .version('1.0.0')
  .argument('[paths...]', 'File names, globs, or directories to concatenate')

  .action(async (paths: string[]) => {
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

      await generateContext(allFiles);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();

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