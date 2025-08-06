import {readFileSync, writeFileSync} from 'fs';
import {parse} from 'csv-parse';

const PASSES = 30;
const T_THRESHOLD = 3.659;  // 99.9% two sided T value at 29 degrees of freedom
const P_SIMULATIONS = 100000;

interface RawResult {
  environment: string;
  testname: string;
  durationMs: number;
  iterations: number;
  pass: number;
}

interface Comparison {
  environment: string;
  basistest: string;  // baseline technique, e.g. "runNumAlias"
  comparetest: string;  // comparison technique, e.g. "runNumWrapper"
  pass: number;  // which pass, 0-19
  iterations: number;  // how many iterations per pass

  basisMs: number;  // speed of the baseline run
  testMs: number;  // speed of the test technique run
  testRatio: number;  // slowdown ratio, e.g. 3.0 means the test was 3 times slower than the baseline
}

interface CompareStats {
  environment: string;
  basistest: string;  // baseline technique, e.g. "runNumAlias"
  comparetest: string;  // comparison technique, e.g. "runNumWrapper"
  samples: number;  // always 20
  basismean: number;  // average milliseconds per test run of runBlahAlias
  testmean: number;  // average milliseconds per test run of runBlahWrapper
  basisstddev: number;  // stddev of basismean
  teststddev: number;  // stddev of testmean
  outliers: number;  // how many points were dropped, if any
  tvalue: number;  // significance of test (T)
  pvalue: number;  // probability of test mean (pvalue) via recombination method
  sig999: boolean;  // t value is larger than T_THRESHOLD
}

async function main(argv: string[]) {
  const results = await parseAll(argv.slice(2));
  results.sort((a: RawResult, b: RawResult) => {
    if (a.environment === b.environment) {
      if (a.testname === b.testname) {
        if (a.pass === b.pass) {
          if (a.iterations === b.iterations) {
            return b.durationMs - a.durationMs;
          } else {
            return b.iterations - a.iterations;
          }
        } else {
          return b.pass - a.pass;
        }
      } else {
        return a.testname.localeCompare(b.testname);
      }
    } else {
      return a.environment.localeCompare(b.environment);
    }
  });

  // compare paired results by pass. This is sort of invalid because of ordering effects?
  const comparisons: Comparison[] = [];
  gatherComparisons(comparisons, results, 'runStringAlias', 'runStringFakeWrapper');
  gatherComparisons(comparisons, results, 'runStringAlias', 'runStringWrapper');
  gatherComparisons(comparisons, results, 'runNumAlias', 'runNumFakeWrapper');
  gatherComparisons(comparisons, results, 'runNumAlias', 'runNumWrapper');

  // Statistical summaries of each trial, where we compare means and determine statistical significance
  const stats = summarize(comparisons);

  writeFileSync('./web/lib/resultsdata.js', `
    const ALL_COMPARISONS = ${JSON.stringify(comparisons, null, 2)};
    const ALL_RESULTS = ${JSON.stringify(results, null, 2)};
    const ALL_STATS = ${JSON.stringify(stats, null, 2)};
  `);
}

function asum(list: number[]): number {
  let sum = 0;
  for (const n of list) {
    sum += n;
  }
  return sum;
}

// Summary statistics written to HTML
function summarize(comparisons: Comparison[]): {[key: string]: CompareStats[]} {
  const results: {[key: string]: CompareStats[]} = {};  //  env name -> HTML text
  const environments = new Set(comparisons.map(c => c.environment));
  const experiments = new Set(comparisons.map(c => c.comparetest));

  for (const env of environments) {
    results[env] = [];
    for (const exp of experiments) {
      const ocs = comparisons.filter(c => c.environment === env && c.comparetest === exp);
      // TODO const cs = dropOutliers(ocs);
      // TODO const outliers = ocs.length - cs.length;
      const cs = ocs;
      const outliers = 0;
      if (ocs.length != PASSES) {
        throw new Error(`Surprising count of passes: ${cs.length}`);
      }
      if (outliers >= PASSES * 0.25) {
        throw new Error(`Surprisingly many outliers: ${outliers}`);
      }
      const samples = cs.length;
      const basistest = cs[0].basistest;
      const basisMs = asum(cs.map(c => c.basisMs));
      const expMs = asum(cs.map(c => c.testMs));
      const basismean = basisMs / samples;
      const testmean = expMs / samples;
      const basisE2 = asum(cs.map(c => (c.basisMs - basismean) * (c.basisMs - basismean)));
      const expE2 = asum(cs.map(c => (c.testMs - testmean) * (c.testMs - testmean)));
      const basisstddev = Math.sqrt(basisE2 / (samples - 1));
      const teststddev = Math.sqrt(expE2 / (samples - 1));
      const tvalue = Math.abs(testmean - basismean) / (teststddev / Math.sqrt(samples));
      const pvalue = simulatePValue(basismean, testmean, [...cs.map(c => c.basisMs), ...cs.map(c => c.testMs)]);

      results[env].push({
        environment: env,
        basistest,
        comparetest: exp,
        samples,
        basismean,
        testmean,
        basisstddev,
        teststddev,
        outliers,
        tvalue,
        pvalue,
        sig999: tvalue >= T_THRESHOLD
      });
    }
  }

  return results;
}

// Simulate other recombinations of these experimental results and determine how often they result
function simulatePValue(basisMean: number, testMean: number, samples: number[]): number {
  const minMeanDiff = Math.abs(basisMean - testMean);
  let sigCount = 0;
  let total = 0;
  for (let i = 0; i < P_SIMULATIONS; i++) {
    total++;
    // Randomly draw half the samples into the second group
    const group1 = [...samples];
    const group2: number[] = [];
    while (group1.length > group2.length) {
      const [item] = group1.splice(Math.floor(Math.random() * (group1.length - 1)), 1);
      group2.push(item);
    }
    if (group1.length != group2.length || group1.length != 30 || group2.length != 30) {
      throw new Error(`Surprising rebalance failure: ${group1.length}`);
    }
    const mean1 = asum(group1) / group1.length;
    const mean2 = asum(group2) / group2.length;
    sigCount += Math.abs(mean1 - mean2) >= minMeanDiff ? 1 : 0;
  }
  return sigCount / total;
}

// Drop data points that are beyond 1.5X the interquartile range
function dropOutliers(comparisons: Comparison[]): Comparison[] {
  // see https://www.khanacademy.org/math/statistics-probability/summarizing-quantitative-data/box-whisker-plots/v/judging-outliers-in-a-dataset
  if (comparisons.length != PASSES) {
    throw new Error(`Surprising pass count: ${comparisons.length}`);
  }
  comparisons.sort((a, b) => a.testMs - b.testMs);
  const p25 = comparisons[Math.floor(PASSES * 0.25)].testMs;
  const p75 = comparisons[Math.floor(PASSES * 0.75)].testMs;
  const iqr = p75 - p25;
  const plo = p25 - iqr * 1.5;
  const phi = p75 + iqr * 1.5;
  const result = comparisons.filter(c => (plo <= c.testMs && c.testMs <= phi));
  return result;
}

// Compare baseline to test
function gatherComparisons(comparisons: Comparison[], data: RawResult[], basistest: string, comparetest: string): void {
  const environments = new Set(data.map(r => r.environment));
  const passes = new Set(data.map(r => r.pass));

  for (const environment of environments) {
    for (const pass of passes) {
      const br = findResult(data, environment, pass, basistest);
      const tr = findResult(data, environment, pass, comparetest);
      if (br.iterations != tr.iterations) {
        throw new Error(`Surprising mismatched iteration count: ${environment}, ${pass}, ${comparetest}`);
      }
      comparisons.push({
        environment, pass, basistest, comparetest,
        basisMs: br.durationMs,
        testMs: tr.durationMs,
        testRatio: tr.durationMs / br.durationMs,
        iterations: br.iterations
      });
    }
  }
}

function findResult(data: RawResult[], environment: string, pass: number, testname: string): RawResult {
  for (const r of data) {
    if (r.environment === environment && r.pass === pass && r.testname === testname) {
      return r;
    }
  }
  throw new Error(`Failed to find result: ${environment}, ${pass}, ${testname}`);
}

// merge all results
async function parseAll(filenames: string[]): Promise<RawResult[]> {
  const results: RawResult[] = [];

  for (const csvfile of filenames) {
    let firstrow: string[]|undefined = undefined;
    for (const row of await parsecsv(csvfile)) {
      if (!firstrow) {
        firstrow = row;
        if (JSON.stringify(row) != JSON.stringify(['environment','testName','iterations','pass','durationMs'])) {
          throw new Error(`Surprising csv: ${csvfile}`);
        }
        continue;
      }
      results.push({
        environment: row[0],
        testname: row[1],
        iterations: parseInt(row[2]),
        pass: parseInt(row[3]),
        durationMs: parseInt(row[4])
      });
    }
  }
  return results;
}

async function parsecsv(filename: string): Promise<string[][]> {
  return new Promise<string[][]>((resolve, reject) => {
    const result: string[][] = [];
    const content = readFileSync(filename);
    const p = parse(content);
    p.on('data', (row: string[]) => result.push(row));
    p.on('end', () => resolve(result));
    p.on('error', reject);
  });
}

main(process.argv);
