import { PargvCommand } from './';

export type CoerceCallback = (val: any, command?: PargvCommand) => boolean;
export type ActionCallback = (...args: any[]) => void;
export type HelpCallback = (command: string, commands?: IMap<PargvCommand>) => string;
export type AnsiStyles = 'bold' | 'italic' | 'underline' | 'inverse' | 'dim' | 'hidden' | 'strikethrough' | 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'grey' | 'gray' | 'bgBlack' | 'bgRed' | 'bgGreen' | 'bgYellow' | 'bgBlue' | 'bgMagenta' | 'bgCyan' | 'bgWhite' | 'bgGray' | 'bgGrey';
export type FigletLayout = 'default' | 'full' | 'fitted' | 'controlled smushing' | 'universal smushing';

export interface IMap<T> {
  [key: string]: T;
}

export interface IPargvOptions {
  strict?: boolean;
  auto?: boolean;
  colorize?: boolean;
  divider: string;
  dupes?: boolean;
  colors?: {
    primary: AnsiStyles | AnsiStyles[];
    accent: AnsiStyles | AnsiStyles[];
    alert: AnsiStyles | AnsiStyles[];
    muted: AnsiStyles | AnsiStyles[];
  };
}

export interface IPargvOption {
  key?: string;
  usage?: string[];
  describe?: string;
  default?: any;
  aliases?: string[];
  as?: string;
  index?: number;
  type?: string;
  flag?: boolean;
  bool?: boolean;
  required?: boolean;
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
  flow(align: number | number[], ...elements: any[]): ILayout;
  repeat(char: string, len?: number, padding?: number | number[]): ILayout;
  section(title: string, padding?: number | number[]): ILayout;
  join(by: string, ...elements: any[]): ILayout;
  render(...elements: any[]): void;
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