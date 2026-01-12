"use client";

import React, { useCallback } from "react";
import { PinContainer } from "@/components/ui/3d-pin";
import { useRouter } from "next/navigation";

interface Props {
  link: string;
  title: string;
  description?: string;
  image: string;
  linkText: string;
}

function isExternal(href: string) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

export function Card({ link, linkText, title, description, image }: Props) {
  const router = useRouter();
  const external = isExternal(link);

  const navigate = useCallback(() => {
    if (external) {
      if (link.startsWith("mailto:") || link.startsWith("tel:")) {
        window.location.href = link;
        return;
      }
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }
    router.push(link);
  }, [external, link, router]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate();
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={navigate}
      onKeyDown={onKeyDown}
      className="relative h-[10rem] w-full flex items-center justify-center cursor-pointer outline-none"
    >
      <div className="absolute top-0 left-0 w-full h-full bg-black opacity-50" />

      {/* PinContainer already renders an <a>, so DO NOT wrap it in another <a> */}
      <PinContainer title={linkText} href={link}>
        <div
          style={{
            backgroundImage: `url(${image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          className="flex basis-full flex-col p-4 tracking-tight text-slate-100/50 sm:basis-1/2 w-[20rem] h-[10rem]"
        >
          <div style={{ filter: "brightness(100%)" }}>
            <h3 className="max-w-xs !pb-2 !m-0 font-bold text-base text-slate-100">
              {title}
            </h3>

            {description ? (
              <p className="text-sm !m-0 !p-0 font-normal text-slate-200/80">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </PinContainer>
    </div>
  );
}
