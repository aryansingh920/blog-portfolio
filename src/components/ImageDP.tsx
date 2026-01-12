"use client";
import { PixelatedCanvas } from "@/components/ui/pixelated-canvas";

export function ImageDP() {
  return (
    <div className="">
      <PixelatedCanvas
        src="dp.png"
        width={200}
        height={200}
        cellSize={1}
        dotScale={0.9}
        shape="square"
        backgroundColor="transparent"
        dropoutStrength={0.2}
        interactive
        distortionStrength={2}
        distortionRadius={50}
        distortionMode="swirl"
        followSpeed={0.2}
        jitterStrength={3}
        jitterSpeed={2}
        sampleAverage
        tintColor="#FFFFFF"
        tintStrength={0.2}
        className=" shadow-lg"
      />
    </div>
  );
}
