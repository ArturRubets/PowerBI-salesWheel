"use strict";

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance = powerbi.VisualObjectInstance;
import DataView = powerbi.DataView;
import VisualObjectInstanceEnumerationObject = powerbi.VisualObjectInstanceEnumerationObject;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import { dataViewObjects } from "powerbi-visuals-utils-dataviewutils";



class VisualSettings {
    title: {
      text: string;
      hide: boolean;
      fontSizeTitle: number;
    };
  
    colorSelector: {
      fill: string;
    };
  
    generalView: {
      arrow: boolean;
    }
}

interface DataPoint{
    data: number;
}

interface ViewModel {
    dataPoint: DataPoint;
    settings: VisualSettings;
}

let defaultSettings: VisualSettings = {
    colorSelector: {
        fill: '#000'
    },  
    title:{
        fontSizeTitle:10,
        hide: false,
        text: 'EXPECTED'
    },
    generalView:{
        arrow: true
    }
};


function visualTransform(options: VisualUpdateOptions, host: IVisualHost): ViewModel {
    let dataViews = options.dataViews;
    let viewModel: ViewModel = {
        dataPoint: null,
        settings: <VisualSettings>{}
    };

    if (!dataViews
        || !dataViews[0]
        || !dataViews[0].categorical
        || !dataViews[0].categorical.values
        || !dataViews[0].categorical.values[0].source
    ) {
        return viewModel;
    }

    let categorical = dataViews[0].categorical;

    let dataValue = categorical.values;

    let objects = dataViews[0].metadata.objects;

    let settings: VisualSettings = {
        colorSelector: {
            fill: dataViewObjects.getValue(objects, {
                objectName: "colorSelector", propertyName: "fill",
            }, defaultSettings.colorSelector.fill),
        },
        generalView: {
            arrow: dataViewObjects.getValue(objects, {
                objectName: "generalView", propertyName: "arrow",
            }, defaultSettings.generalView.arrow),
        },
        title:{
            fontSizeTitle: dataViewObjects.getValue(objects, {
                objectName: "title", propertyName: "fontSizeTitle",
            }, defaultSettings.title.fontSizeTitle),
            hide: dataViewObjects.getValue(objects, {
                objectName: "title", propertyName: "hide",
            }, defaultSettings.title.hide),
            text: dataViewObjects.getValue(objects, {
                objectName: "title", propertyName: "text",
            }, defaultSettings.title.text),
        }     
    };

    return {
        dataPoint: null,
        settings: settings
    };
}




export class Visual implements IVisual {
    private settings: VisualSettings;
    private host: IVisualHost;
    private element: HTMLElement;


    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.element = options.element;
    }

    public update(options: VisualUpdateOptions) {
        let viewModel: ViewModel = visualTransform(options, this.host);
        this.settings = viewModel.settings;
        console.log(viewModel);
        
    }


    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): powerbi.VisualObjectInstanceEnumeration {
        let objectName = options.objectName;
        let objectEnumeration: VisualObjectInstance[] = [];

        if (!this.settings ||
            !this.settings.colorSelector ||
            !this.settings.generalView ||
            !this.settings.title) {
            return objectEnumeration;
        }

        switch (objectName) {
            case 'title':
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        text: this.settings.title.text,
                        hide: this.settings.title.hide,
                        fontSizeTitle: this.settings.title.fontSizeTitle
                    },
                    validValues: {
                        fontSizeTitle: {
                            numberRange: {
                                min: 6,
                                max: 40
                            }
                        }
                    },
                    selector: null
                });
                break;
            case 'generalView':
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        arrow: this.settings.generalView.arrow
                    },
                    selector: null
                });
                break;                
            case 'colorSelector':
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        fill: this.settings.colorSelector.fill
                    },
                    selector: null
                });
                break;
        };
        return objectEnumeration;
    }
}



