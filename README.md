DESCRIPTION: 
   This script performs a long-term surface water dynamics assessment for the 
   Hayk lake in Ethiopia using the JRC Global Surface Water dataset.

 INPUTS:
   - JRC Global Surface Water Dataset (1984–2024)
   - Region of Interest (ROI) bounding box for Lakes Hayk
OUTPUTS & RESULTS:
   1. Interactive Map Layers:
      - 90% Occurrence Water Mask (Static persistent water)
      - Water Occurrence (Historical frequency of water presence)
      - Occurrence Change Intensity (Where water presence changed)
      - Transition Classes (Categorized historical changes e.g., permanent, seasonal)
      - Highlighted regions of explicit Water Expansion (Blue) and Contraction (Red)
  2. Console Diagnostics & Charts:
      - Area breakdown (ha) of JRC water transition classes visualized as a Pie Chart.
      - Quantified Water Expansion vs. Contraction areas calculated in Hectares (ha).
      - A Comparative Column Chart displaying Expansion vs. Contraction.
