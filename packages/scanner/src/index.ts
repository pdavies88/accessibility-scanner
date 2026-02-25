import { Command } from 'commander';
import { SitemapScanner } from './scanner';
import { ReportGenerator } from './report-generator';
import { DatabaseService } from './database';

const program = new Command();

program
  .name('a11y-scanner')
  .description('Accessibility scanner using axe-core')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan a website using its sitemap')
  .requiredOption('-s, --sitemap <url>', 'Sitemap URL')
  .option('-o, --output <path>', 'Output directory', './reports')
  .option('-c, --concurrent <number>', 'Concurrent pages to scan', '5')
  .option('--headless', 'Run in headless mode', true)
  .action(async (options) => {
    const scanner = new SitemapScanner(options);
    const report = await scanner.scan();
    
    const db = new DatabaseService();
    await db.saveReport(report);
    
    const generator = new ReportGenerator();
    await generator.generateReport(report, options.output);
  });

program.parse();