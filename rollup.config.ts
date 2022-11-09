import fs from "fs";
import path from "path";
import typescript from "@rollup/plugin-typescript";
import cleaner from "rollup-plugin-cleaner";

const ROOT = path.resolve(__dirname, "./");
const PKG = JSON.parse(fs.readFileSync(path.resolve(ROOT, "./package.json")).toString());

export default function () {
  return [
    {
      external: [...Object.keys(PKG.dependencies || {}), ...Object.keys(PKG.devDependencies || {})],
      input: {
        index: "src/index.ts",
      },
      cache: false,
      output: {
        dir: "./lib",
        format: "umd",
        name: "ObservableSlim"
      },
      plugins: [
        cleaner({
          targets: ["./lib"],
        }),
        typescript({
          cacheDir: "./node_modules/.rollup.cache",
          sourceMap: false,
          outputToFilesystem: false,
          declarationDir: "./lib/types",
          exclude: "rollup.config.ts",
          tsconfig: path.resolve(__dirname, "./tsconfig.json"),
        }),
      ],
    },
  ];
}
