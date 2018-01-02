
import { Pargv } from '../';
const pargv = new Pargv();

const args = process.argv;

process.argv.push('help')

pargv
  .name('App', null, 'Standard')
  .version('0.0.0')
  .description('My application')
  .license('MIT')
  .epilog('Copyright 2017')


pargv.command('order.o --tries [tries:number:2]')
  .option('<name:number:35>')
  .option('--type, -t <type>', 'type of food.')
  .option('--size, -s <size>', 'the size.', null, 'small, medium, large')
  .option('--cheese, -c')
  .option('--sausage, -s')
  .option('--pineapple, -p')
  .option('--ham, -h')
  .default('--size', 'medium')
// .demand('--size')
// .when('--type', '--size')
// .min.options(3)
// .max.options(4)

// result = pargv.parse(['o', '--type', 'pizza', '-cp']);
pargv.parse();

