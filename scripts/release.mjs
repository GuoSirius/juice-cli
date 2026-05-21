#!/usr/bin/env node

import { execSync } from 'child_process';
import { confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_PATH = path.join(__dirname, '../package.json');

function getCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf-8'));
  return pkg.version;
}

function calculateNextVersion(currentVersion, releaseType) {
  const parts = currentVersion.split('.').map(Number);
  switch (releaseType) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
      parts[2]++;
      break;
    default:
      throw new Error(`Unknown release type: ${releaseType}`);
  }
  return parts.join('.');
}

function checkUnstagedFiles() {
  try {
    const output = execSync('git status --porcelain', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(line => line.trim());
  } catch (error) {
    console.error(chalk.red('Error checking git status:', error.message));
    process.exit(1);
  }
}

function commitFiles(message) {
  try {
    execSync('git add .', { stdio: 'ignore' });
    execSync(`git commit -F -`, { input: message, stdio: ['pipe', 'pipe', 'pipe'] });
    console.log(chalk.green('Files committed successfully'));
  } catch (error) {
    console.error(chalk.red('Error committing files:', error.message));
    process.exit(1);
  }
}

function runStandardVersion(releaseType) {
  try {
    const args = ['--release-as', releaseType];
    execSync(`npx standard-version ${args.join(' ')}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log(chalk.green('Version updated and changelog generated'));
  } catch (error) {
    console.error(chalk.red('Error running standard-version:', error.message));
    process.exit(1);
  }
}

function pushToRemote() {
  try {
    console.log(chalk.blue('Pushing to origin...'));
    execSync('git push origin main', { stdio: 'inherit' });
    execSync('git push origin --tags', { stdio: 'inherit' });
    console.log(chalk.green('Pushed to origin successfully'));

    console.log(chalk.blue('Pushing to github...'));
    execSync('git push github main', { stdio: 'inherit' });
    execSync('git push github --tags', { stdio: 'inherit' });
    console.log(chalk.green('Pushed to github successfully'));
  } catch (error) {
    console.error(chalk.red('Error pushing to remote:', error.message));
    process.exit(1);
  }
}

async function main() {
  console.log(chalk.blue.bold('=== Juice CLI Release Script ===\n'));
  
  const currentVersion = getCurrentVersion();
  console.log(chalk.yellow(`Current version: ${currentVersion}\n`));

  const unstagedFiles = checkUnstagedFiles();
  
  if (unstagedFiles.length > 0) {
    console.log(chalk.yellow('Unstaged or modified files detected:'));
    unstagedFiles.forEach(file => {
      console.log(`  ${file}`);
    });
    console.log('');

    const shouldCommit = await confirm({
      message: 'Do you want to commit these files before release?',
      default: true
    });

    if (shouldCommit) {
      const commitMessage = await input({
        message: 'Enter commit message (must follow conventional commit format):',
        validate: (value) => {
          if (!value.trim()) {
            return 'Commit message cannot be empty';
          }
          const regex = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z]+\))?: .+/;
          if (!regex.test(value.trim())) {
            return 'Commit message must follow conventional format (e.g., "feat: add new feature")';
          }
          return true;
        }
      });

      commitFiles(commitMessage);
      console.log('');
    }
  }

  const releaseTypes = [
    {
      name: `Major`,
      value: 'major',
      description: `${currentVersion} → ${calculateNextVersion(currentVersion, 'major')}`
    },
    {
      name: `Minor`,
      value: 'minor',
      description: `${currentVersion} → ${calculateNextVersion(currentVersion, 'minor')}`
    },
    {
      name: `Patch`,
      value: 'patch',
      description: `${currentVersion} → ${calculateNextVersion(currentVersion, 'patch')}`
    }
  ];

  const releaseType = await select({
    message: 'Select release type:',
    choices: releaseTypes,
    default: 'patch'
  });

  const nextVersion = calculateNextVersion(currentVersion, releaseType);
  
  const confirmRelease = await confirm({
    message: `Confirm release: ${currentVersion} → ${nextVersion}?`,
    default: true
  });

  if (!confirmRelease) {
    console.log(chalk.yellow('Release cancelled'));
    process.exit(0);
  }

  console.log('\n' + chalk.blue('Updating version and changelog...'));
  runStandardVersion(releaseType);

  console.log('\n' + chalk.blue('Pushing to origin...'));
  pushToRemote();

  console.log('\n' + chalk.green.bold('=== Release completed successfully! ==='));
  console.log(chalk.yellow('\nNote: npm publish will be handled by GitHub Actions workflow on tag push.'));
}

main().catch(error => {
  console.error(chalk.red('Release failed:', error.message));
  process.exit(1);
});
