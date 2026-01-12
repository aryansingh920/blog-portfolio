"use client";

import React from "react";
import { Card } from "./Card";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-neutral-950 relative">
      <div className="max-w-4xl mx-auto p-4 flex flex-col items-center">
        <h1 className="text-3xl md:text-5xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600 text-center font-sans font-bold mt-12 lg:mt-40">
          Connect With me Here!
        </h1>

        <div className="flex flex-col md:flex-row justify-center items-center mt-8 space-y-8 md:space-y-0 md:space-x-8">
          <Card
            title="LinkedIn"
            description="Connect with me on LinkedIn"
            link="https://www.linkedin.com/in/aryan-singh-axone125/"
            linkText="linkedin.com/in/aryan-singh-axone125"
            image="/img/linkedin.png"
          />
          <Card
            title="Email"
            description="Write to me at"
            link="mailto:aryansingh920@outlook.com"
            linkText="aryansingh920@outlook.com"
            image="/img/mail.png"
          />
          <Card
            title="GitHub"
            description="Check out my GitHub"
            link="https://github.com/aryansingh920"
            linkText="github.com/aryansingh920"
            image="/img/github.png"
          />
        </div>
      </div>
    </div>
  );
}
