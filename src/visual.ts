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
        fontSizeValue: number;
        fillArrow: string;
        precision: number
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
        fontSizeTitle: null,
        hide: false
    },
    generalView: {
        arrow: true,
        fontSizeValue: null,
        fillArrow: '#8CA89E',
        precision: 2
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
            fontSizeValue: dataViewObjects.getValue(objects, {
                objectName: "generalView", propertyName: "fontSizeValue",
            }, defaultSettings.generalView.fontSizeValue),
            precision: dataViewObjects.getValue(objects, {
                objectName: "generalView", propertyName: "precision",
            }, defaultSettings.generalView.precision),
            fillArrow: dataViewObjects.getFillColor(objects, { objectName: 'generalView', propertyName: 'fillArrow' }, defaultSettings.generalView.fillArrow),
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
            fillInner: dataViewObjects.getFillColor(objects, { objectName: 'circle', propertyName: 'fillInner' }, defaultSettings.circle.fillInner),
            fillOuter: dataViewObjects.getFillColor(objects, { objectName: 'circle', propertyName: 'fillOuter' }, defaultSettings.circle.fillOuter),
        }
    };
    let dataPoint: DataPoint = { data: values[0].values[0], title: values[1]?.values[0]?.toString() };

    return {
        dataPoint: dataPoint,
        settings: settings
    };
}




export class Visual implements IVisual {
    private events: IVisualEventService;
    private settings: VisualSettings;
    private host: IVisualHost;
    private svg: Selection<any>;
    private circleContainer: Selection<any>;
    private titleContainer: Selection<any>;
    private dataContainer: Selection<any>;
    private valueContainer: Selection<any>;
    private dataPoint: DataPoint;


    constructor(options: VisualConstructorOptions) {
        this.events = options.host.eventService;
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
        this.valueContainer.html('')
        this.events.renderingStarted(options);

        let viewModel: ViewModel = visualTransform(options, this.host);
        this.settings = viewModel.settings;
        this.dataPoint = viewModel.dataPoint;

        if (typeof (this.dataPoint.data as number) != 'number') {
            return
        }

        let data = Number((this.dataPoint.data as number)) // предположительно дробное число меньше единицы


        let width = options.viewport.width;
        let height = options.viewport.height;
        this.svg.attr("width", width).attr("height", height);


        let padding = Math.min(width, height) * 0.05    //Отступ всего элемента 5%


        let circleParam = this.getCircleParam(width, height, padding, data)


        //При более 100% 5сек, если меньше то на каждый процент 34милс
        let duration = data > 1 ? 5000 : data % 1 * 100 * 34
        let delay = 500
        this.drawCircle(circleParam, options, duration, delay)

        this.drawTitle(circleParam)


        let valueX = circleParam.centerCircleX + circleParam.radiusCircle * 1.38 + circleParam.strokeWidth
        let valueY = circleParam.centerCircleY + circleParam.radiusCircle + circleParam.strokeWidth / 2

        let fontSizeData = this.settings.generalView.fontSizeValue ? this.settings.generalView.fontSizeValue :
            circleParam.radiusCircle + circleParam.strokeWidth / 2

        const showData = (data * 100).toFixed(this.settings.generalView.precision) // например число 0,35 умножаем на сто и получаем 35%

        let text = this.valueContainer
            .append('text')
            .text(`${showData}%`)
            .attr('x', valueX)
            .attr('y', valueY)
            .style('font-size', fontSizeData)
            .style('fill', this.settings.circle.fillOuter)
            .style('font-weight', 600)

        let valueDom = text.node().getBBox()

        if (this.settings.generalView.arrow) {
            this.createArrow(valueDom, valueY, fontSizeData, options)
        }
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
                        fontSizeTitle: this.settings.title.fontSizeTitle,
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
                        arrow: this.settings.generalView.arrow,
                        fontSizeValue: this.settings.generalView.fontSizeValue,
                        fillArrow: this.settings.generalView.fillArrow,
                        precision: this.settings.generalView.precision,
                    },
                    validValues: {
                        fontSizeValue: {
                            numberRange: {
                                min: 0,
                                max: 200
                            }
                        }
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


    private getCircleParam(widthVisual, heightVisual, padding, data) {
        let strokeWidth = this.settings.circle.stroke
        let widthCircle = widthVisual * 0.35
        let heightCircle = heightVisual
        let radiusCircle = Math.min(widthCircle / 2, heightCircle / 2) - strokeWidth / 2 - padding
        if (strokeWidth >= radiusCircle) {
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
    private drawCircle(circleParam, options, duration, delay) {
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
            .then(() => {
                this.events.renderingFinished(options);
            })
    }

    private createArrow(valueDom, valueY, fontSizeData, options) {
        let arrowX = valueDom.x + valueDom.width * 1.1
        let arrowY = valueY
        let strokeWidthArrow = fontSizeData / 10
        let heightArrow = valueDom.height / 2.5

        this.valueContainer
            .append('path')
            .attr('id', 'arrow')
            .style('stroke', this.settings.generalView.fillArrow)
            .style('stroke-width', strokeWidthArrow)
            .style('fill', 'none')
            .attr('stroke-linecap', 'round')
            .attr('d', `M ${arrowX} ${arrowY} 
                l 0 ${-(heightArrow)} 
                m -${strokeWidthArrow / 15} 0
                l -${heightArrow * 0.2} ${heightArrow * 0.2}
                m ${heightArrow * 0.2 + strokeWidthArrow / 5} -${heightArrow * 0.2}
                l ${heightArrow * 0.2} ${heightArrow * 0.2}
            `)
    }

    private drawTitle(circleParam) {
        this.titleContainer.html('')
        let fontSize = this.settings.title.fontSizeTitle ?
            this.settings.title.fontSizeTitle :
            circleParam.radiusCircle / 1.3


        let titleX = circleParam.centerCircleX + circleParam.radiusCircle * 1.38 + circleParam.strokeWidth
        let titleY = circleParam.centerCircleY - circleParam.radiusCircle - circleParam.strokeWidth / 2
        if (!this.settings.title.hide) {
            let title = this.dataPoint.title.split('\n')

            const text = this.titleContainer
                .append('text')
                .attr('x', titleX)
                .attr('y', titleY)

            const tspan1 = text.append('tspan')
                .text(title[0])
                .attr('dominant-baseline', 'hanging')
                .style('font-size', fontSize)
                .style('fill', 'rgb(160, 160, 160)')
                .style('font-weight', 600)

            let prevtspan = tspan1
            title.forEach((t, i) => {
                if (i > 0) {
                    prevtspan = text.append('tspan')
                        .text(t)
                        .attr('dy', fontSize * 1.5)
                        .attr('dx', -prevtspan.node().getBBox().width)
                        .attr('dominant-baseline', 'hanging')
                        .style('font-size', fontSize)
                        .style('fill', 'rgb(160, 160, 160)')
                        .style('font-weight', 600)
                }
            })
        }
    }
}



