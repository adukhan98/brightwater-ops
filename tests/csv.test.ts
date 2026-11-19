import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("splits simple rows and fields", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("keeps commas inside quoted fields", () => {
    expect(parseCsv('name,notes\nTea,"leave at back door, ring bell"')).toEqual([
      ["name", "notes"],
      ["Tea", "leave at back door, ring bell"],
    ]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseCsv('"say ""hello""",x')).toEqual([['say "hello"', "x"]]);
  });

  it("keeps line breaks inside quoted fields", () => {
    expect(parseCsv('a,"line one\nline two"\nb,c')).toEqual([
      ["a", "line one\nline two"],
      ["b", "c"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("ignores a trailing line break", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("strips a UTF-8 byte order mark", () => {
    expect(parseCsv("﻿customer,sku\nX,Y")).toEqual([
      ["customer", "sku"],
      ["X", "Y"],
    ]);
  });

  it("keeps empty fields", () => {
    expect(parseCsv('a,,""\n,,')).toEqual([
      ["a", "", ""],
      ["", "", ""],
    ]);
  });
});
