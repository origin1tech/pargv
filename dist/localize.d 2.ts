import { Pargv } from './';
import { IPargvLocalize } from './interfaces';
export declare function localize(pargv: Pargv): (singular: string, plural?: string) => IPargvLocalize;
