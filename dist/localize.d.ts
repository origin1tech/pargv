import { Pargv } from './';
import { IPargvLocalize } from './interfaces';
import { IColurs } from 'colurs';
export declare function localize(pargv: Pargv, colurs: IColurs): (singular: string, plural?: string) => IPargvLocalize;
