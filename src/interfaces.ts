import { SpawnOptions, ChildProcess, SpawnSyncReturns, SpawnSyncOptions } from 'child_process';
import { Pargv, PargvCommand } from './';
import { IAnsiStyles } from 'colurs';

export type ErrorHandler = (err: Error) => void;
export type NodeCallback = (err?: Error, data?: any) => void;
export type LogHandler = (message: string) => void;
export type CoerceHandler = (val: any, command?: PargvCommand) => any;
export type ActionHandler = (...args: any[]) => void;

export type SpawnAsyncMethod = (command: string | IPargvSpawnConfig, args?: string[], options?: SpawnOptions) => ChildProcess;
export type SpawnSyncMethod = (command: string, args?: string[], options?: SpawnSyncOptions) => SpawnSyncReturns<Buffer | string>;
export type SpawnMethod = SpawnAsyncMethod; // may allow sync in future | SpawnSyncMethod;
export type SpawnActionHandler = (method: SpawnMethod, config: IPargvSpawnConfig, parsed?: IPargvParsedResult, cmd?: PargvCommand) => void | ChildProcess;

export type CompletionHandler = (current: string, argv: any[] | NodeCallback, done?: CompletionHandlerCallback) => any[];
export type CompletionHandlerCallback = (completions: any[]) => void;
export type HelpHandler = (command: string, commands?: IMap<PargvCommand>) => string;
export type LocalizeInit = (singular: string, plural?: string) => IPargvLocalize;
export type AnsiStyles = keyof IAnsiStyles;

export type FigletLayout = 'default' | 'full' | 'fitted' | 'controlled smushing' | 'universal smushing';

export interface IMap<T> {
  [key: string]: T;
}

export interface IPargvSpawnConfig {
  command: string;
  args: any[];
  options: SpawnOptions;
}

// Just the most common properties.
export interface IPackage extends IMap<any> {
  name: string;
  version: string;
  description: string;
  license: string;
  main: string;
  bin: IMap<any>;
  typings: string;
  keywords: string[];
  scripts: IMap<any>;
  author: string | string[] | IMap<any>[];
  contributors: string | string[] | IMap<any>[];
  repository: IMap<any>;
  bugs: IMap<any>;
  homepage: string;
  dependencies: IMap<any>;
  devDependencies: IMap<any>;
  peerDependencies: IMap<any>;
  [key: string]: any;
}

export interface IPargvOptions {
  cast?: boolean;
  splitArgs?: string | null;
  colorize?: boolean;
  displayHeader?: boolean;
  displayFooter?: boolean;
  headingDivider?: string;
  commandDivider?: string;
  itemDivider?: string;
  locale?: string;
  localeDir?: string;
  autoHelp?: boolean;
  fallbackHelp?: boolean | HelpHandler;
  defaultHelp?: boolean;
  // exitHelp?: boolean;
  castBeforeCoerce?: boolean;
  extendCommands?: boolean;
  spreadCommands?: boolean;
  extendAliases?: boolean;
  extendStats?: boolean;
  allowAnonymous?: boolean;
  ignoreTypeErrors?: boolean;
  displayStackTrace?: boolean;
  layoutWidth?: number;
  colors?: {
    primary?: AnsiStyles | AnsiStyles[];
    accent?: AnsiStyles | AnsiStyles[];
    alert?: AnsiStyles | AnsiStyles[];
    muted?: AnsiStyles | AnsiStyles[];
  };
}

export interface IPargvEnv {
  CWD: string;
  EXEC: string;
  EXEC_PATH: string;
  NODE_PATH: string;
  HOME_PATH: string;
  GLOBAL_PATH: string;
  NODE_ENV: string;
  PLATFORM: string;
  PKG: IPackage;
}

export interface IPargvCompletionPaths {
  appName: string;  // the base app name
  appPath: string;    // the executable app path.
  bashPath: string | boolean;   // the bash profile path.
  completionsDir: string;   // the directory to save completions.sh in.
  completionsPath: string; // the completions path.
}

export interface IPargvCompletionsConfig {
  paths: IPargvCompletionPaths;
  command: string;
  script: string;
  sourceScript: string;
}

export interface IPargvCompletions {
  getPaths(path: string): IPargvCompletionPaths;
  ensureDir(dir: string): boolean;
  generate(path?: string, command?: string, template?: string): IPargvCompletionsConfig;
  write(path: string, script: string, append?: boolean): boolean;
  install(path?: string, command?: string, template?: string, force?: boolean);
  handler(current: string, args: any[], done?: CompletionHandlerCallback): any[];
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
  isVariadic: boolean;
}

export interface IPargvParsedResult {
  $exec?: string;
  $command?: string;
  $external?: string;
  $commands?: any[];
  $variadics?: any[];
  $source?: string[];
  $stats?: IPargvStats;
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


export interface IPargvStats {
  commands?: any[];
  options?: any[];
  map?: any[];
  normalized: any[];
  missing?: any[];
  anonymous?: any[];
  whens?: any[];
  commandsCount?: number;
  optionsCount?: number;
}

export interface IPargvLocalize {
  args(...args: any[]): IPargvLocalize;
  setArg(singular: string, plural?: string | number, index?: number): IPargvLocalize;
  styles(...styles: any[]): IPargvLocalize;
  count(count: number): IPargvLocalize;
  done(): string;
}
