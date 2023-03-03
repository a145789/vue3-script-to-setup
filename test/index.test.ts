import { describe, expect, it } from "vitest";
import {
  cwd,
  pathResolve,
  getTheFileAbsolutePath,
  useConfigPath,
} from "../src/utils";
import fg from "fast-glob";
import { FileType, Output } from "../src/constants";
import {
  testScript1,
  testScript2,
  testScript3,
  transformToSingeLine,
} from "./utils";
import transformScript from "../src/transform/script";
import { parseSync } from "@swc/core";
import { genScriptUnicodeMap, getRealSpan } from "../src/transform/utils";

const output: Output = {
  warn() {},
  log() {},
  success() {},
  error() {},
};

describe("test utils", () => {
  it("test getTheFileAbsolutePath", () => {
    expect(getTheFileAbsolutePath()).toBeUndefined();
    expect(getTheFileAbsolutePath("foo.js")).toBeUndefined();
    expect(getTheFileAbsolutePath("./example/src/Foo.vue")).toBeUndefined();
    expect(getTheFileAbsolutePath("./example/src/App.vue")).toBe(
      pathResolve(cwd, "./example/src/App.vue"),
    );
    expect(getTheFileAbsolutePath(cwd, "./example", "src", "App.vue")).toBe(
      pathResolve(cwd, "./example/src/App.vue"),
    );
  });

  it("test useConfigPath", async () => {
    expect(
      (
        await useConfigPath(
          "tosetup.config.a",
          pathResolve(__dirname, "fixtures"),
        )
      ).pathNames,
    ).toEqual([
      pathResolve(cwd, "./example/src/App.vue"),
      pathResolve(cwd, "./example/src/components/Tab.vue"),
      pathResolve(cwd, "example/src/views/404.vue"),
    ]);

    const { pathNames, option } = await useConfigPath(
      "tosetup.config.b",
      pathResolve(__dirname, "fixtures"),
    );
    expect(pathNames.sort()).toEqual(
      fg
        .sync(pathResolve(cwd, "./example/src/**"))
        .filter((path) => !path.endsWith("views/Home.vue"))
        .sort(),
    );

    expect(option).toEqual({
      propsNotOnlyTs: true,
    });
  });

  it("test getRealSpan", async () => {
    const str = "Hello, may name is '真TM的好'。";
    const offset = 0;

    genScriptUnicodeMap(str, offset);
    expect(getRealSpan({ start: 0, end: 4 }, offset)).toEqual({
      start: 0,
      end: 4,
    });

    expect(getRealSpan({ start: 20, end: 26 }, offset)).toEqual({
      start: 20,
      end: 24,
    });
  });
});

describe("test transform script", () => {
  it("test", async () => {
    expect(
      transformToSingeLine(
        transformScript({
          fileType: FileType.ts,
          script: testScript1.code.trim(),
          offset: 0,
          parseSync,
          output,
        }),
      ),
    ).toBe(transformToSingeLine(testScript1.transform.trim()));

    expect(
      transformToSingeLine(
        transformScript({
          fileType: FileType.ts,
          script: testScript2.code.trim(),
          offset: 0,
          parseSync,
          output,
        }),
      ),
    ).toBe(transformToSingeLine(testScript2.transform.trim()));

    expect(
      transformToSingeLine(
        transformScript({
          fileType: FileType.ts,
          script: testScript3.code.trim(),
          offset: 0,
          parseSync,
          output,
        }),
      ),
    ).toBe(transformToSingeLine(testScript3.transform.trim()));
  });
});
