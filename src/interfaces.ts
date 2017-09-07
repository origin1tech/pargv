import { PargvCommand, Pargv } from './';
import { PargvError } from './utils';

export type ErrorHandler = (message: string, error: PargvError, pargv?: Pargv) => void;
export type CoerceHandler = (val: any, command?: PargvCommand) => any;
export type ActionHandler = (...args: any[]) => void;
export type CompletionHandler = (args: any, fn: { (result: any): void }) => void;
export type HelpHandler = (command: string, commands?: IMap<PargvCommand>) => string;
export type AnsiStyles = 'bold' | 'italic' | 'underline' | 'inverse' | 'dim' | 'hidden' | 'strikethrough' | 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'grey' | 'gray' | 'bgBlack' | 'bgRed' | 'bgGreen' | 'bgYellow' | 'bgBlue' | 'bgMagenta' | 'bgCyan' | 'bgWhite' | 'bgGray' | 'bgGrey';
export type FigletLayout = 'default' | 'full' | 'fitted' | 'controlled smushing' | 'universal smushing';

export interface IMap<T> {
  [key: string]: T;
}

// export interface ILogger {
//   error(...args: any[]): void;
//   warn(...args: any[]): ILogger;
//   info(...args: any[]): ILogger;
//   write(...args: any[]): ILogger;
//   exit(code: any): void;
// }

export interface IPargvOptions {
  cast?: boolean;
  colorize?: boolean;
  headingDivider?: string;
  itemDivider?: string;
  locale?: string;
  localeDir?: string;
  autoHelp?: boolean;
  defaultHelp?: boolean;
  castBeforeCoerce?: boolean;
  extendCommands?: boolean;
  allowAnonymous?: boolean;
  ignoreTypeErrors?: boolean;
  displayStackTrace?: boolean;
  exitOnError?: boolean;
  layoutWidth?: number;
  colors?: {
    primary: AnsiStyles | AnsiStyles[];
    accent: AnsiStyles | AnsiStyles[];
    alert: AnsiStyles | AnsiStyles[];
    muted: AnsiStyles | AnsiStyles[];
  };
}

export interface IPargvEnv {
  EXEC: string;
  EXEC_PATH: string;
  NODE_PATH: string;
  HOME_PATH: string;
  GLOBAL_PATH: string;
  NODE_ENV: string;
  PLATFORM: string;
}

export interface IPargvMetadata {
  name?: string | [string, AnsiStyles | AnsiStyles[], string];
  description?: string;
  version?: string;
  license?: string;
  epilog?: string;
}

export interface IPargvCommandOption {
  key?: string;
  usage?: string[];
  describe?: string;
  default?: any;
  aliases?: string[];
  as?: string;
  index?: number;
  type?: string | RegExp | CoerceHandler;
  flag?: boolean;
  bool?: boolean;
  required?: boolean;
}

export interface IPargvParsedResult {
  $exec?: string;
  $command?: string;
  $commands?: string[];
  $source?: string[];
  [key: string]: any;
}

export interface IPargvCoerceConfig {
  fn: string | RegExp | CoerceHandler;
  def?: any;
}

export interface IPargvWhenConfig {
  demand: string;
  converse?: boolean;
}

export interface IFigletOptions {
  text?: string;
  font?: string;
  horizontalLayout?: FigletLayout;
  verticalLayout?: FigletLayout;
}

export interface IPargvLayout {
  div(...elements: any[]): IPargvLayout;
  span(...elements: any[]): IPargvLayout;
  repeat(char: string, len?: number, padding?: number | number[]): IPargvLayout;
  section(title: string, padding?: number | number[]): IPargvLayout;
  join(by: string, ...elements: any[]): IPargvLayout;
  show(...elements: any[]): void;
  get(): string;
  ui: any;
}

export interface IPargvLogo {
  fonts(): any[];
  show(): void;
  get(): string;
}

export interface IY18nOptions {
  directory?: string;
  updateFiles?: boolean;
  locale?: string;
  fallbackToLanguage?: boolean;
}
