import { PargvCommand, Pargv } from './';

export type ErrorHandler = (err?: Error, pargv?: Pargv) => void;
export type CoerceCallback = (val: any, command?: PargvCommand) => boolean;
export type ActionCallback = (...args: any[]) => void;
export type HelpCallback = (command: string, commands?: IMap<PargvCommand>) => string;
export type AnsiStyles = 'bold' | 'italic' | 'underline' | 'inverse' | 'dim' | 'hidden' | 'strikethrough' | 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'grey' | 'gray' | 'bgBlack' | 'bgRed' | 'bgGreen' | 'bgYellow' | 'bgBlue' | 'bgMagenta' | 'bgCyan' | 'bgWhite' | 'bgGray' | 'bgGrey';
export type FigletLayout = 'default' | 'full' | 'fitted' | 'controlled smushing' | 'universal smushing';

export interface IMap<T> {
  [key: string]: T;
}

export interface ILogger {
  error(...args: any[]): void;
  warn(...args: any[]): ILogger;
  info(...args: any[]): ILogger;
  write(...args: any[]): ILogger;
  exit(code: any): void;
}

export interface IPargvOptions {
  auto?: boolean;
  colorize?: boolean;
  divider?: string;
  colors?: {
    primary: AnsiStyles | AnsiStyles[];
    accent: AnsiStyles | AnsiStyles[];
    alert: AnsiStyles | AnsiStyles[];
    muted: AnsiStyles | AnsiStyles[];
  };
  extendCommands?: boolean;
  allowAnonymous?: boolean;
  ignoreTypeErrors?: boolean;
  displayStackTrace?: boolean;
}

export interface IPargvOption {
  key?: string;
  usage?: string[];
  describe?: string;
  default?: any;
  aliases?: string[];
  as?: string;
  index?: number;
  type?: string | RegExp | CoerceCallback;
  flag?: boolean;
  bool?: boolean;
  required?: boolean;
}

export interface IPargvParsedResult {
  $exec?: string;
  $command?: string;
  $commands?: string[];
  $metadata?: {
    source?: string[];
    execPath?: string;
    nodePath?: string;
    globalPrefix?: string;
  };
  [key: string]: any;
}

export interface IPargvCoerceConfig {
  fn: string | RegExp | CoerceCallback;
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

export interface ILayout {
  div(...elements: any[]): ILayout;
  span(...elements: any[]): ILayout;
  repeat(char: string, len?: number, padding?: number | number[]): ILayout;
  section(title: string, padding?: number | number[]): ILayout;
  join(by: string, ...elements: any[]): ILayout;
  show(...elements: any[]): void;
  get(): string;
  ui: any;
}

export interface ILogo {
  fonts(): any[];
  render(): void;
  show(): void;
  get(): string;
}