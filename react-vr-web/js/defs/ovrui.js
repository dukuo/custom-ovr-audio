declare module 'ovrui' {

  declare type FontDims = {
    maxWidth: number,
    maxHeight: number,
    maxDescent: number,
    numLines: number,
    lineWidths: Array<number>,
  };

  declare class GuiSys {
    font: any;

    constructor(): GuiSys;
    add(view: any): void;
    setCursorEnabled(flag: boolean): void;
  }

  declare function wrapLines(
    font: any,
    text: string,
    fontHeight: number,
    maxWidth: ?number,
    maxHeight: ?number,
    maxLines: ?number
  ): any;

  declare function measureText(
    font: any,
    text: string,
    fontHeight: number
  ): FontDims;
}
