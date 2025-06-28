declare module 'asciichart' {
  export function plot(series: number[] | number[][], cfg?: {
    min?: number;
    max?: number;
    offset?: number;
    padding?: string;
    height?: number;
    colors?: string[];
    symbols?: string[];
    format?: (x: number, i: number) => string;
  }): string;

  export const black: string;
  export const red: string;
  export const green: string;
  export const yellow: string;
  export const blue: string;
  export const magenta: string;
  export const cyan: string;
  export const lightgray: string;
  export const darkgray: string;
  export const lightred: string;
  export const lightgreen: string;
  export const lightyellow: string;
  export const lightblue: string;
  export const lightmagenta: string;
  export const lightcyan: string;
  export const white: string;
  export const reset: string;
  export function colored(char: string, color: string): string;
}