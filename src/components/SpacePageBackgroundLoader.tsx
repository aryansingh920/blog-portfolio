"use client";
import dynamic from "next/dynamic";

const SpacePageBackground = dynamic(() => import("./SpacePageBackground"), { ssr: false });

export default function SpacePageBackgroundLoader() {
  return <SpacePageBackground />;
}
