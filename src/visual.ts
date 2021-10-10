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
import PrimitiveValue = powerbi.PrimitiveValue;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import { dataViewObjects } from "powerbi-visuals-utils-dataviewutils";
import { Primitive } from "d3-array";
type Selection<T1, T2 = T1> = d3.Selection<any, T1, any, T2>;
import * as d3 from "d3";


class VisualSettings {
    title: {
        hide: boolean;
        fontSizeTitle: number;
    };


    generalView: {
        arrow: boolean;
    };

    circle: {
        stroke: number;
        fillOuter: string;
        fillInner: string;
    }
}

interface DataPoint {
    data: PrimitiveValue;
    title: string;
}

interface ViewModel {
    dataPoint: DataPoint;
    settings: VisualSettings;
}

let defaultSettings: VisualSettings = {
    title: {
        fontSizeTitle: 15,
        hide: false,
    },
    generalView: {
        arrow: true
    },
    circle: {
        stroke: 10,
        fillOuter: '#5161B4',
        fillInner: '#F1F3FE'
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

    let values = categorical.values;

    let objects = dataViews[0].metadata.objects;


    let settings: VisualSettings = {
        generalView: {
            arrow: dataViewObjects.getValue(objects, {
                objectName: "generalView", propertyName: "arrow",
            }, defaultSettings.generalView.arrow),
        },
        title: {
            fontSizeTitle: dataViewObjects.getValue(objects, {
                objectName: "title", propertyName: "fontSizeTitle",
            }, defaultSettings.title.fontSizeTitle),
            hide: dataViewObjects.getValue(objects, {
                objectName: "title", propertyName: "hide",
            }, defaultSettings.title.hide),
        },

        circle: {
            stroke: dataViewObjects.getValue(objects, {
                objectName: "circle", propertyName: "stroke",
            }, defaultSettings.circle.stroke),
            fillInner: dataViewObjects.getFillColor(objects, {objectName: 'circle', propertyName: 'fillInner'}, defaultSettings.circle.fillInner),
            fillOuter: dataViewObjects.getFillColor(objects, {objectName: 'circle', propertyName: 'fillOuter'}, defaultSettings.circle.fillOuter),
        }
    };


    let dataPoint: DataPoint = { data: values[0].values[0], title: values[0].source.displayName };

    return {
        dataPoint: dataPoint,
        settings: settings
    };
}




export class Visual implements IVisual {
    private events: IVisualEventService;
    private element: HTMLElement;

    private settings: VisualSettings;
    private host: IVisualHost;
    private svg: Selection<any>;
    private outerContainer: Selection<any>;
    private circleContainer: Selection<any>;
    private titleContainer: Selection<any>;
    private dataContainer: Selection<any>;
    private arrowContainer: Selection<any>;
    private valueContainer: Selection<any>;

    private dataPoint: DataPoint;

    constructor(options: VisualConstructorOptions) {
        this.events = options.host.eventService;
        this.element = options.element;
        this.host = options.host;

        this.svg = d3Select(options.element)
            .append('svg')


        this.circleContainer = this.svg
            .append('g')

        this.dataContainer = this.svg
            .append('g')    
            
        this.titleContainer = this.dataContainer
            .append('g')
            
        this.valueContainer = this.dataContainer
            .append('g')
    }

    public update(options: VisualUpdateOptions) {
        this.events.renderingStarted(options);

        let viewModel: ViewModel = visualTransform(options, this.host);
        this.settings = viewModel.settings;
        this.dataPoint = viewModel.dataPoint;      
        
        if (typeof (this.dataPoint.data as number) != 'number' || (this.dataPoint.data as number) < 0) {
            return
        }

        let data = Number((this.dataPoint.data as number).toFixed(4))

        let width = options.viewport.width;
        let height = options.viewport.height;
        this.svg.attr("width", width).attr("height", height);


        let padding = Math.min(width, height) * 0.05    //Отступ всего элемента 5%


        let circleParam = this.getCircleParam(width, height, padding, data)
        
        //При более 100% 5сек, если меньше то на каждый процент 34милс
        let durationAnimation = data > 1 ? 5000: data % 1 * 100 * 34            
        this.drawCircle(circleParam, options, durationAnimation, 500)


        this.drawTitle(circleParam)


      
        this.valueContainer.html('')
        let valueX = circleParam.centerCircleX + circleParam.radiusCircle * 1.38 + circleParam.strokeWidth
        let valueY = circleParam.centerCircleY + circleParam.radiusCircle + circleParam.strokeWidth / 2

        let fontSizeData = circleParam.radiusCircle + circleParam.strokeWidth
        let text = this.valueContainer
            .append('text')
            .text(`${data * 100}%`)
            .attr('x', valueX)
            .attr('y', valueY)
            .style('font-size',  fontSizeData)
            .style('fill', this.settings.circle.fillOuter)
            .style('font-weight', 600)

        this.valueContainer
                .append('defs')
                .append('marker')
                .attr('id', 'arrow')
                .attr('markerUnits', 'strokeWidth')
                .attr('markerWidth', fontSizeData / 15)
                .attr('markerHeight', fontSizeData / 15)
                .attr('viewBox', '0 0 20 20')
                .attr('refX', 10)
                .attr('refY', 10)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M2,2 L10,6 L2,10 L6,6 L2,2')
                .style('fill', 'red')
                
        let valueDom = text.node().getBBox()
        let arrowX = valueDom.x + valueDom.width * 1.1
        let arrowY = valueY
        this.valueContainer
            .append('line')
            .attr('x1', arrowX)
            .attr('y1', arrowY)
            .attr('x2', arrowX)
            .attr('y2', arrowY - valueDom.height / 3)
            .style('stroke', 'red')
            .style('stroke-width', fontSizeData / 15)
            .attr('marker-end', "url(#arrow)").node()

            
    }


    public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): powerbi.VisualObjectInstanceEnumeration {
        let objectName = options.objectName;
        let objectEnumeration: VisualObjectInstance[] = [];

        if (!this.settings ||
            !this.settings.circle ||
            !this.settings.generalView ||
            !this.settings.title) {
            return objectEnumeration;
        }

        switch (objectName) {
            case 'title':
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        hide: this.settings.title.hide,
                        fontSizeTitle: this.settings.title.fontSizeTitle
                    },
                    validValues: {
                        fontSizeTitle: {
                            numberRange: {
                                min: 6,
                                max: 60
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
            case 'circle':
                objectEnumeration.push({
                    objectName: objectName,
                    properties: {
                        stroke: this.settings.circle.stroke,
                        fillInner: this.settings.circle.fillInner,
                        fillOuter: this.settings.circle.fillOuter
                    },
                    validValues: {
                        stroke: {
                            numberRange: {
                                min: 0,
                                max: 50
                            }
                        }
                    },
                    selector: null
                });
                break;
        };
        return objectEnumeration;
    }


    private getCircleParam(widthVisual, heightVisual, padding, data){
        let strokeWidth = this.settings.circle.stroke
        let widthCircle = widthVisual * 0.35
        let heightCircle = heightVisual
        let radiusCircle = Math.min(widthCircle / 2, heightCircle / 2) - strokeWidth / 2 - padding
        if(strokeWidth >= radiusCircle){
            strokeWidth = Math.floor(radiusCircle)
            this.settings.circle.stroke = strokeWidth
            radiusCircle = Math.min(widthCircle / 2, heightCircle / 2) - strokeWidth / 2 - padding
        }
        let centerCircleX = widthCircle / 2;
        let centerCircleY = heightCircle / 2;
        
        
        let lengthCircle = 2 * Math.PI * radiusCircle
        let percentFill = data
        
        let lengthFill = lengthCircle * percentFill
        let lengthOffset = lengthCircle / 4

        return {
            strokeWidth,
            widthCircle,
            heightCircle,
            radiusCircle,
            centerCircleX,
            centerCircleY,
            lengthCircle,
            percentFill,
            lengthFill,
            lengthOffset,
            fillInner: this.settings.circle.fillInner,
            fillOuter: this.settings.circle.fillOuter
        }
    }
    private drawCircle(circleParam, options, duration, delay){
        this.circleContainer.html('')

        this.circleContainer
            .append('circle')
            .attr('cx', circleParam.centerCircleX)
            .attr('cy', circleParam.centerCircleY)
            .attr('r', circleParam.radiusCircle)
            .style('stroke-width', circleParam.strokeWidth)
            .style('stroke', circleParam.fillInner)

        this.circleContainer
            .append('circle')
            .attr('id', 'target')
            .attr('cx', circleParam.centerCircleX)
            .attr('cy', circleParam.centerCircleY)
            .attr('r', circleParam.radiusCircle)            
            .style('stroke-width', circleParam.strokeWidth)
            .style('stroke', circleParam.fillOuter)
            .attr('stroke-dashoffset', circleParam.lengthOffset)    
            .attr('stroke-dasharray', `0, ${circleParam.lengthCircle}`)

        d3.select('#target')
            .transition()
            .duration(duration)   
            .delay(delay)        
            .attr('stroke-dasharray', `${circleParam.lengthFill}, ${circleParam.lengthCircle - circleParam.lengthFill}`)
            .end()
            .then(() =>{
                this.events.renderingFinished(options);
            })
    }

    private drawTitle(circleParam){
        this.titleContainer.html('')
        let titleX = circleParam.centerCircleX + circleParam.radiusCircle * 1.38 + circleParam.strokeWidth
        let titleY = circleParam.centerCircleY - circleParam.radiusCircle - circleParam.strokeWidth / 2  + this.settings.title.fontSizeTitle
        if(!this.settings.title.hide){
            let title = this.dataPoint.title
            this.titleContainer
                .append('text')
                .text(title)
                .attr('x', titleX)
                .attr('y', titleY)
                .style('font-size', this.settings.title.fontSizeTitle)
                .style('fill', 'rgb(160, 160, 160)')
                .style('font-weight', 600)
        }
    }
}



