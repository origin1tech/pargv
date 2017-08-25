import { Pargv, PargvCommand } from './';

export type FigletLayout = 'default' | 'full' | 'fitted' | 'controlled smushing' | 'universal smushing';

export type CastType = 'object' | 'json' | 'array' | 'regexp' | 'float' | 'integer' | 'number' | 'date' | 'boolean';

export type AnsiStyles = 'bold' | 'italic' | 'underline' | 'inverse' | 'dim' | 'hidden' | 'strikethrough' | 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'grey' | 'gray' | 'bgBlack' | 'bgRed' | 'bgGreen' | 'bgYellow' | 'bgBlue' | 'bgMagenta' | 'bgCyan' | 'bgWhite' | 'bgGray' | 'bgGrey';

export type CoerceCallback = (val: any, option?: IPargvCommandOption, command?: PargvCommand) => boolean;
export type ActionCallback = (...args: any[]) => void;
export type HelpCallback = (command: string, commands?: IPargvCommands) => string;



// COMMON //

export interface IMap<T> {
  [key: string]: T;
}

export interface IMetadata {
  [key: string]: any;
}

// HELPERS //

export interface IFigletOptions {
  text?: string;
  font?: string;
  horizontalLayout?: FigletLayout;
  verticalLayout?: FigletLayout;
}

export interface ILayoutOptions {
  text: string;
  width?: number;
  padding?: number | number[];
  align?: string;
  border?: boolean;
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

// PARGV & PARGV COMMAND //

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

export interface IPargvCommandConfig {
  name?: string;
  usage?: string;
  command?: string;
  description?: string;
  aliases?: string | string[];
  examples?: string[];
  options?: IMap<IPargvCommandOption>;
  action?: ActionCallback;
}

export interface IPargvCommands {
  [key: string]: PargvCommand;
}

export interface IPargvCommandOption {
  name?: string;
  description?: string;
  aliases?: string | string[];
  type?: string;
  flag?: boolean;
  required?: boolean;
  as?: string;
  position?: number;
  default?: any;
  coerce?: string | CoerceCallback;
}

export interface IPargvResult {
  cmd?: string;
  cmds?: any[];
  flags?: { [key: string]: any; };
  globalPath?: string;
  nodePath?: string;
  execPath?: string;
  exec?: string;
}

export interface IPargvCommandOptions {
  [key: string]: IPargvCommandOption;
}

export interface IPargvOptionStats {
  commandsMissing?: IPargvCommandOption[];
  commandsRequiredCount?: number;
  commandsOptionalCount?: number;
  commandsMissingCount?: number;
  flagsMissing: IPargvCommandOption[];
  flagsRequiredCount?: number;
  flagsOptionalCount?: number;
  flagsMissingCount?: number;
  unknown?: any[];
  flagsDuplicates?: any[];
}