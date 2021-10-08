"use strict";

import { dataViewObjectsParser } from "powerbi-visuals-utils-dataviewutils";
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

export class VisualSettings extends DataViewObjectsParser {
   public barChart: Settings = new Settings();
}


export class Settings {
  title: {
    text: string;
    hide:boolean;
    fontSizeTitle:number;
  };
  
  colorSelector:{
    fill: string;
  };
  
  generalView:{
    arrow: boolean;
  }
}

