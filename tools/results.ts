import {readFileSync} from 'fs';
import {parse} from 'csv-parse';

function main(argv: string[]) {
  for (const csvfile of argv.slice(2)) {
    const content = readFileSync(csvfile);
    parse(content).on('data', (row) => {
      // TODO
      console.log(`row: ${JSON.stringify(row)}`);
    });
  }
}

main(process.argv);
