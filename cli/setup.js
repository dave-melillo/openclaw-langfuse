#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log(chalk.cyan.bold('\n🐺 OpenClaw Langfuse Setup Wizard\n'));

async function main() {
  console.log('This wizard will help you set up Langfuse observability + reinforcement learning for your OpenClaw instance.\n');

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'hosting',
      message: 'Where will you host Langfuse?',
      choices: [
        { name: 'Langfuse Cloud (recommended for quick start)', value: 'cloud' },
        { name: 'Self-hosted (Fly.io/Railway)', value: 'self-hosted' }
      ]
    },
    {
      type: 'input',
      name: 'publicKey',
      message: 'Enter your Langfuse public key:',
      validate: (input) => input.startsWith('pk-lf-') || 'Public key should start with pk-lf-'
    },
    {
      type: 'password',
      name: 'secretKey',
      message: 'Enter your Langfuse secret key:',
      validate: (input) => input.startsWith('sk-lf-') || 'Secret key should start with sk-lf-'
    },
    {
      type: 'input',
      name: 'baseUrl',
      message: 'Langfuse base URL:',
      default: (answers) => answers.hosting === 'cloud' ? 'https://us.cloud.langfuse.com' : 'https://langfuse.yourdomain.com'
    },
    {
      type: 'confirm',
      name: 'enableAnalysis',
      message: 'Enable weekly trace analysis (reinforcement learning)?',
      default: true
    },
    {
      type: 'list',
      name: 'analysisDay',
      message: 'What day should weekly analysis run?',
      choices: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: 'Friday',
      when: (answers) => answers.enableAnalysis
    },
    {
      type: 'input',
      name: 'analysisTime',
      message: 'What time should analysis run? (24hr format, e.g., 17:00)',
      default: '17:00',
      when: (answers) => answers.enableAnalysis,
      validate: (input) => /^\d{1,2}:\d{2}$/.test(input) || 'Format: HH:MM'
    }
  ]);

  console.log(chalk.green('\n✓ Configuration complete!\n'));

  // Generate config for OpenClaw
  const config = {
    plugins: {
      allow: ['openclaw-langfuse'],
      entries: {
        'openclaw-langfuse': {
          enabled: true,
          config: {
            publicKey: answers.publicKey,
            secretKey: answers.secretKey,
            baseUrl: answers.baseUrl,
            enabled: true,
            debug: false
          }
        }
      }
    }
  };

  console.log(chalk.cyan('Generated OpenClaw config:'));
  console.log(JSON.stringify(config, null, 2));

  const { proceed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Apply this configuration to OpenClaw?',
      default: true
    }
  ]);

  if (proceed) {
    console.log(chalk.yellow('\nTo apply this config, run:'));
    console.log(chalk.bold('  openclaw config patch < config.json'));
    console.log('\nOr manually add to your openclaw.json file.\n');

    const configPath = './openclaw-langfuse-config.json';
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(chalk.green(`✓ Config saved to: ${configPath}`));

    if (answers.enableAnalysis) {
      console.log(chalk.cyan('\n📊 Setting up weekly analysis cron job...'));
      console.log('Add this cron job to OpenClaw:');
      
      const dayMap = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 0 };
      const [hour, minute] = answers.analysisTime.split(':');
      
      const cronJob = {
        name: 'Weekly Langfuse Trace Analysis',
        schedule: {
          kind: 'cron',
          expr: `${minute} ${hour} * * ${dayMap[answers.analysisDay]}`,
          tz: 'America/New_York'
        },
        payload: {
          kind: 'agentTurn',
          message: 'Run Langfuse trace analysis and generate LESSONS_LEARNED.md',
          timeoutSeconds: 300
        },
        sessionTarget: 'isolated',
        delivery: {
          mode: 'announce',
          channel: 'discord'
        }
      };

      fs.writeFileSync('./openclaw-langfuse-cron.json', JSON.stringify(cronJob, null, 2));
      console.log(chalk.green('✓ Cron config saved to: openclaw-langfuse-cron.json'));
    }
  }

  console.log(chalk.cyan.bold('\n🎉 Setup complete!'));
  console.log('\nNext steps:');
  console.log('1. Apply config: openclaw config patch < openclaw-langfuse-config.json');
  console.log('2. Restart OpenClaw: openclaw gateway restart');
  console.log('3. Check traces: ' + answers.baseUrl);
  console.log('4. Read docs: https://github.com/dave-melillo/openclaw-langfuse#readme\n');
}

main().catch(err => {
  console.error(chalk.red('Error:'), err);
  process.exit(1);
});
