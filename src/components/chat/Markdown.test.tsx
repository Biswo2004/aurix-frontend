import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Source } from "@/lib/types";
import { Markdown } from "./Markdown";

const sources: Source[] = [
  { id: 1, fileName: "paper.pdf", location: "Page 68", excerpt: "x" },
  { id: 2, fileName: "paper.pdf", location: "Page 57", excerpt: "y" },
];

describe("Markdown citations", () => {
  it("turns [n] into a button that names the file and page", () => {
    const html = renderToStaticMarkup(<Markdown sources={sources}>{"It scores well [1][2]."}</Markdown>);
    expect(html).toContain('title="paper.pdf · Page 68"');
    expect(html).toContain('title="paper.pdf · Page 57"');
    expect(html.match(/<button/g)?.length).toBe(2);
  });
  it("leaves numbers without a source and code alone", () => {
    const html = renderToStaticMarkup(<Markdown sources={sources}>{"See [7] and `a[1]` here."}</Markdown>);
    expect(html).not.toContain("<button");
    expect(html).toContain("[7]");
  });
  it("does nothing when there are no sources", () => {
    expect(renderToStaticMarkup(<Markdown>{"Plain [1]."}</Markdown>)).not.toContain("<button");
  });
  it("understands the 【4†L1-L5】 style some models write and makes it clickable", () => {
    const html = renderToStaticMarkup(<Markdown sources={sources}>{"First fact 【1†L1-L5】 and second 【2】."}</Markdown>);
    expect(html).not.toContain("【");
    expect(html.match(/<button/g)?.length).toBe(2);
    expect(html).toContain('title="paper.pdf · Page 68"');
  });
  it("hides a marker that is still being typed while the reply streams", () => {
    expect(renderToStaticMarkup(<Markdown>{"Growing text 【4†L1"}</Markdown>)).not.toContain("【");
  });
  it("shows the [n] as plain text when the marker has no matching source", () => {
    const html = renderToStaticMarkup(<Markdown sources={sources}>{"Unknown 【9†L1-L2】."}</Markdown>);
    expect(html).toContain("[9]");
    expect(html).not.toContain("<button");
  });
});
