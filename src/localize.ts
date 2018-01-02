
import { Pargv } from './';
import { IPargvLocalize } from './interfaces';
import { Lokales, ILokalesOptions } from 'lokales';
import { PARGV_ROOT } from './constants';
import { resolve } from 'path';
import * as utils from './utils';
import { IColurs } from 'colurs';


export function localize(pargv: Pargv, colurs: IColurs) {

  const opts: ILokalesOptions = {
    directory: resolve(PARGV_ROOT, pargv.options.localeDir),
    locale: pargv.options.locale
  };

  const lokales = new Lokales(opts);

  /**
   * Common
   * : Common method for localization.
   *
   * @param singular the localization singular key to lookup.
   * @param plural the localization plural key to lookup.
   * @param count optional count for pluralization or args.
   * @param args arguments used in formatting message.
   * @param sytles ansi styles for matching index arguments
   */
  function common(singular: string, plural: string, count: number, args: any, styles: any) {

    args = args || [];
    styles = styles || [];

    args.forEach((el, i) => { // stylize if matching style at index.
      if (styles[i]) {
        const _styles = utils.toArray<string>(styles[i]);
        args[i] = colurs.applyAnsi(el, _styles);
      }
    });

    if (plural)
      return lokales.__n(singular, plural, count, ...args);
    return lokales.__(singular, ...args);

  }

  function init(singular: string, plural?: string): IPargvLocalize {

    let methods: IPargvLocalize;
    let _count, _args, _styles;

    methods = {

      count: (count?: number) => {
        _count = count;
        return methods;
      },

      args: (...args: any[]) => {
        if (utils.isArray(utils.first(args))) {
          args = args[0];
        }
        _args = args;
        return methods;
      },

      setArg: (singular: string, plural?: string | number, count?: number, index?: number) => {
        if (utils.isValue(plural)) {
          if (utils.isNumber(plural)) { // this is singular index.
            index = <number>plural;
            plural = undefined;
          }
        }
        _args = _args || [];
        if (utils.isNumber(plural)) {
          index = <number>plural;
          plural = undefined;
        }
        const result = init(singular, <string>plural).done();
        if (index)
          _args[index] = result;
        else
          _args.push(result);
        return methods;
      },

      styles: (...styles: any[]) => {
        _styles = styles;
        return methods;
      },

      done: () => {
        return common(singular, plural, _count, _args, _styles);
      }

    };

    return methods;

  }

  return init;

}