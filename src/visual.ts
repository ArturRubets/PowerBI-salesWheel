"use strict";
import {
    select as d3Select
} from "d3-selection";
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
type Selection<T1, T2 = T1> = d3.Selection<any, T1, any, T2>;


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
            fill: (<powerbi.Fill>(dataViewObjects.getObject(objects, "colorSelector", {fill:{solid:{color:defaultSettings.colorSelector.fill}}}).fill)).solid.color
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
    private svg: Selection<any>;
    private outerContainer: Selection<any>;
    private circleContainer: Selection<any>;
    private titleContainer: Selection<any>;
    private dataContainer: Selection<any>;
    private arrowContainer: Selection<any>;
    private valueContainer: Selection<any>;


    constructor(options: VisualConstructorOptions) {
        this.host = options.host;

        this.svg = d3Select(options.element)
            .append('svg')

        this.outerContainer = this.svg
            .append('g')

        this.circleContainer = this.outerContainer
            .append('g')

        this.dataContainer = this.outerContainer
            .append('g')

        this.titleContainer = this.dataContainer
            .append('g')

        this.arrowContainer = this.dataContainer
            .append('g')

        this.valueContainer = this.dataContainer
            .append('g')
    }

    public update(options: VisualUpdateOptions) {
        let viewModel: ViewModel = visualTransform(options, this.host);
        this.settings = viewModel.settings;
        
        //this.outerContainer = this.outerContainer.data()

        this.circleContainer
            .append('circle')
            .attr('cx', 100)
            .attr('cy', 100)
            .attr('r', 50)
            .style('stroke-width', 2)
            .style('stroke', this.settings.colorSelector.fill)

        
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



