declare module 'react-plotly.js/factory' {
    import { ComponentType } from 'react';
    import Plotly from 'plotly.js';

    interface PlotParams {
        data: Plotly.Data[];
        layout?: Partial<Plotly.Layout>;
        config?: Partial<Plotly.Config>;
        style?: React.CSSProperties;
        className?: string;
        useResizeHandler?: boolean;
        onInitialized?: (figure: Readonly<{ data: Plotly.Data[]; layout: Plotly.Layout }>, graphDiv: HTMLElement) => void;
        onUpdate?: (figure: Readonly<{ data: Plotly.Data[]; layout: Plotly.Layout }>, graphDiv: HTMLElement) => void;
        onPurge?: (figure: Readonly<{ data: Plotly.Data[]; layout: Plotly.Layout }>, graphDiv: HTMLElement) => void;
        onError?: (err: Error) => void;
        divId?: string;
    }

    function createPlotlyComponent(plotly: typeof Plotly): ComponentType<PlotParams>;
    export default createPlotlyComponent;
}

declare module 'plotly.js-dist-min' {
    import Plotly from 'plotly.js';
    export = Plotly;
}
