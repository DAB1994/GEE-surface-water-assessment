// ==================================================================================
// DESCRIPTION: 
//   This script performs a long-term surface water dynamics assessment for the 
//   Hayq and Ardibbo lakes region in Ethiopia using the JRC Global Surface Water dataset.
//
// INPUTS:
//   - JRC Global Surface Water Dataset (1984–2024)
//   - Region of Interest (ROI) bounding box for Lakes Hayq & Ardibbo
//
// OUTPUTS & RESULTS:
//   1. Interactive Map Layers:
//      - 90% Occurrence Water Mask (Static persistent water)
//      - Water Occurrence (Historical frequency of water presence)
//      - Occurrence Change Intensity (Where water presence changed)
//      - Transition Classes (Categorized historical changes e.g., permanent, seasonal)
//      - Highlighted regions of explicit Water Expansion (Blue) and Contraction (Red)
//   2. Console Diagnostics & Charts:
//      - Area breakdown (ha) of JRC water transition classes visualized as a Pie Chart.
//      - Quantified Water Expansion vs. Contraction areas calculated in Hectares (ha).
//      - A Comparative Column Chart displaying Expansion vs. Contraction.
// ==================================================================================

//////////////////////////////////////////////////////////////
// Step 1: Load Data and Define the Region
//////////////////////////////////////////////////////////////

var gsw = ee.Image('JRC/GSW1_0/GlobalSurfaceWater');
var occurrence = gsw.select('occurrence');
var change = gsw.select("change_abs");
var transition = gsw.select('transition');

// Define the region of interest (ROI) covering both lakes Hayq and Ardibbo
var roi = ee.Geometry.Polygon([
  [[39.72, 11.38], [39.72, 11.20], [39.58, 11.20], [39.58, 11.38]]
]);

//////////////////////////////////////////////////////////////
// Step 2: Set Visualization Parameters
//////////////////////////////////////////////////////////////

var VIS_OCCURRENCE = {
    min: 0,
    max: 100,
    palette: ['red', 'blue']
};
var VIS_CHANGE = {
    min: -50,
    max: 50,
    palette: ['red', 'black', 'limegreen']
};
var VIS_WATER_MASK = {
    palette: ['white', 'black']
};

//////////////////////////////////////////////////////////////
// Step 3: Helper Functions
//////////////////////////////////////////////////////////////

function safeStringConversion(value) {
    return ee.String(value);
}

function createFeature(transition_class_stats) {
    transition_class_stats = ee.Dictionary(transition_class_stats);
    var class_number = transition_class_stats.get('transition_class_value');
    var result = {
        transition_class_number: class_number,
        transition_class_name: lookup_names.get(class_number),
        transition_class_palette: lookup_palette.get(class_number),
        area_m2: transition_class_stats.get('sum')
    };
    return ee.Feature(null, result);
}

function createPieChartSliceDictionary(fc) {
    return ee.List(fc.aggregate_array("transition_class_palette"))
        .map(function (p) {
            return {'color': p};
        }).getInfo();
}

//////////////////////////////////////////////////////////////
// Step 4: Retrieve Transition Classes
//////////////////////////////////////////////////////////////

var transition_class_values = gsw.get('transition_class_values');
var transition_class_names = gsw.get('transition_class_names');
var transition_class_palette = gsw.get('transition_class_palette');

var lookup_names;
var lookup_palette;

if (transition_class_values && transition_class_names && transition_class_palette) {
    lookup_names = ee.Dictionary.fromLists(
        ee.List(transition_class_values).map(safeStringConversion),
        ee.List(transition_class_names)
    );
    lookup_palette = ee.Dictionary.fromLists(
        ee.List(transition_class_values).map(safeStringConversion),
        ee.List(transition_class_palette)
    );
} else {
    print("Error: One or more properties are missing from the GSW dataset.");
    lookup_names = ee.Dictionary({});
    lookup_palette = ee.Dictionary({});
}

//////////////////////////////////////////////////////////////
// Step 5: Water Mask and Histogram
//////////////////////////////////////////////////////////////

var water_mask = occurrence.gt(90).mask(1);

//////////////////////////////////////////////////////////////
// Step 6: Summarize Transition Classes
//////////////////////////////////////////////////////////////

var area_image_with_transition_class = ee.Image.pixelArea().addBands(transition);
var reduction_results = area_image_with_transition_class.reduceRegion({
    reducer: ee.Reducer.sum().group({
        groupField: 1,
        groupName: 'transition_class_value'
    }),
    geometry: roi,
    scale: 30,
    bestEffort: true
});
print('Reduction Results:', reduction_results);

var roi_stats = ee.List(reduction_results.get('groups'));

var transition_fc;
if (roi_stats.size().gt(0)) {
    transition_fc = ee.FeatureCollection(roi_stats.map(createFeature));

    // Display a summary pie chart
    var transition_summary_chart = ui.Chart.feature.byFeature({
        features: transition_fc,
        xProperty: 'transition_class_name',
        yProperties: ['area_m2', 'transition_class_number']
    })
        .setChartType('PieChart')
        .setOptions({
            title: 'Summary of Transition Class Areas',
            slices: createPieChartSliceDictionary(transition_fc),
            sliceVisibilityThreshold: 0
        });
    print(transition_summary_chart);
} else {
    print("Error: No transition class data available for the region.");
}

//////////////////////////////////////////////////////////////
// Step 7: Initialize Map Location
//////////////////////////////////////////////////////////////

Map.setCenter(39.71, 11.35, 13);

//////////////////////////////////////////////////////////////
// Step 8: Map Layers Visualization
//////////////////////////////////////////////////////////////

Map.addLayer({
    eeObject: water_mask,
    visParams: VIS_WATER_MASK,
    name: '90% Occurrence Water Mask',
    shown: false
});
Map.addLayer({
    eeObject: occurrence.updateMask(occurrence.divide(100)),
    name: 'Water Occurrence (1984-2024)',
    visParams: VIS_OCCURRENCE,
    shown: false
});
Map.addLayer({
    eeObject: change,
    visParams: VIS_CHANGE,
    name: 'Occurrence Change Intensity',
    shown: false
});
Map.addLayer({
    eeObject: transition,
    name: 'Transition Classes (1984-2024)'
});

//////////////////////////////////////////////////////////////
// Step 9: Detecting Water Body Expansion and Contraction
//////////////////////////////////////////////////////////////

// Sub-step 1: Identify expanded and contracted water areas
var expandedWater = change.gt(20).selfMask();
var contractedWater = change.lt(-20).selfMask();

// Sub-step 2: Calculate the area of expansion and contraction (in hectares)
var expandedWaterArea = expandedWater.multiply(ee.Image.pixelArea()).divide(10000).reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 30,
    bestEffort: true
});

var contractedWaterArea = contractedWater.multiply(ee.Image.pixelArea()).divide(10000).reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: roi,
    scale: 30,
    bestEffort: true
});

print('Expanded Water Area (ha):', expandedWaterArea);
print('Contracted Water Area (ha):', contractedWaterArea);

// Sub-step 3: Display expanded and contracted water areas on the map
Map.addLayer(expandedWater, {palette: 'blue'}, 'Expanded Water');
Map.addLayer(contractedWater, {palette: 'red'}, 'Contracted Water');

// Sub-step 4: Generate a bar chart to compare water expansion and contraction
var waterChangeStats = ee.FeatureCollection([
    ee.Feature(null, {'Class': 'Expanded Water', 'Area (ha)': expandedWaterArea.get('change_abs')}),
    ee.Feature(null, {'Class': 'Contracted Water', 'Area (ha)': contractedWaterArea.get('change_abs')})
]);

var waterChangeChart = ui.Chart.feature.byFeature(waterChangeStats, 'Class', 'Area (ha)')
    .setChartType('ColumnChart')
    .setOptions({
        title: 'Comparison of Water Expansion and Contraction',
        hAxis: {title: 'Water Change Class'},
        vAxis: {title: 'Area (ha)'},
        colors: ['blue', 'red']
    });

print(waterChangeChart);