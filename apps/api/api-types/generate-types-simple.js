#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

async function runCommand(command, args, description) {
  console.log(`${description}...`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
    });

    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });

    child.on('error', error => {
      reject(new Error(`Failed to run ${command}: ${error.message}`));
    });
  });
}

async function generateTypes() {
  try {
    const schemasDir = './generated/schemas';
    const jsOutputDir = './generated/schemas-js';

    // Ensure JS output directory exists
    await mkdir(jsOutputDir, { recursive: true });

    // Find all schema files
    const files = await readdir(schemasDir);
    const schemaFiles = files.filter(f => f.endsWith('-schemas.ts') && f !== 'index.ts');

    if (schemaFiles.length === 0) {
      console.log('ℹ️  No schema files found to process');
      return;
    }

    console.log(`📁 Found ${schemaFiles.length} schema files:`, schemaFiles);

    // Step 1: Transpile TypeScript schemas to JavaScript
    const tscArgs = [
      '--target',
      'es2020',
      '--module',
      'commonjs',
      '--outDir',
      jsOutputDir,
      '--skipLibCheck',
      '--declaration',
      'false',
      '--sourceMap',
      'false',
      ...schemaFiles.map(f => join(schemasDir, f)),
    ];

    await runCommand('npx', ['tsc', ...tscArgs], '🔨 Transpiling schemas to JavaScript');

    // Step 2: Generate types for each transpiled schema
    for (const schemaFile of schemaFiles) {
      const sectorName = schemaFile.replace('-schemas.ts', '');
      const jsSchemaPath = join(jsOutputDir, schemaFile.replace('.ts', '.js'));
      const outputDir = join('./generated/types', sectorName);

      console.log(`📝 Generating types for ${sectorName} sector...`);

      await runCommand(
        'zod2ts',
        ['--zod-path', jsSchemaPath, '--output-dir', outputDir],
        `   Processing ${jsSchemaPath}`
      );
    }

    console.log('🎉 Type generation completed successfully!');
  } catch (error) {
    console.error('❌ Error generating types:', error.message);
    process.exit(1);
  }
}

generateTypes();
