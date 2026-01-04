// app/blogs/page.tsx
"use client";

import { SwipeFeed } from "./components/SwipeFeed";
import { demoPosts } from "./data";

export default function BlogsPage() {
  return <SwipeFeed posts={demoPosts} />;
}
