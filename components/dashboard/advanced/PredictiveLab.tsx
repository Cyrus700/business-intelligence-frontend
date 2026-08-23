"use client";

import { PbFilterProvider } from "./PbFilterContext";
import SlicerBar from "./SlicerBar";
import ForecastScenarios from "./ForecastScenarios";
import Segmentation from "./Segmentation";

/** Self-contained predictive-analytics canvas: probabilistic forecast + ML segmentation. */
export default function PredictiveLab() {
  return (
    <PbFilterProvider>
      <div className="space-y-4">
        <SlicerBar />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <ForecastScenarios metric="revenue" horizon={30} nPaths={500} />
          </div>
          <Segmentation dimension="product" nClusters={4} />
          <Segmentation dimension="region" nClusters={3} />
        </div>
      </div>
    </PbFilterProvider>
  );
}
