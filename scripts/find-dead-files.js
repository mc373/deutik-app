import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import madge from "madge";

// __dirname replacement
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine entry file
const ENTRY = (() => {
  const possibleEntries = [
    "src/main.tsx",
    "src/index.tsx",
    "src/main.jsx",
    "src/index.jsx",
  ];
  const entry = possibleEntries.find((file) =>
    fs.existsSync(path.resolve(file))
  );
  if (!entry) {
    throw new Error(
      "No entry file found (e.g., src/main.tsx or src/index.jsx)"
    );
  }
  return entry;
})();

// Recursively get all files in a directory with specific extensions
function getAllFiles(dir, extensions, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getAllFiles(filePath, extensions, fileList);
    } else if (extensions.some((ext) => file.endsWith(`.${ext}`))) {
      // Normalize paths to use forward slashes and make relative to project root
      fileList.push(
        path.relative(path.resolve("."), filePath).replace(/\\/g, "/")
      );
    }
  });
  return fileList;
}

// Main logic
(async () => {
  try {
    // Analyze dependency graph with madge
    const res = await madge(path.resolve(ENTRY), {
      tsConfig: path.resolve("tsconfig.json"),
      includeNpm: false,
      fileExtensions: ["ts", "tsx", "js", "jsx"],
      resolveAlias: { "@": path.resolve("src") },
    });

    // Get all files in the dependency graph
    const graph = res.obj(); // {file: [deps]}
    const allSet = new Set();

    // Add all files and their dependencies to the set
    Object.keys(graph).forEach((file) => allSet.add(file));
    Object.values(graph).forEach((deps) =>
      deps.forEach((dep) => allSet.add(dep))
    );

    // Get all source files in src directory
    const extensions = ["ts", "tsx", "js", "jsx"];
    const allFiles = getAllFiles(path.resolve("src"), extensions);

    // Find dead files (not in dependency graph)
    const deadFiles = allFiles.filter((file) => !allSet.has(file));

    // Output results
    console.log(">>> Entry file:", ENTRY);
    console.log(">>> Dead files (never imported), total %d:", deadFiles.length);
    if (deadFiles.length === 0) {
      console.log("  No dead files found.");
    } else {
      deadFiles.forEach((file) => console.log("  ", file));
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
})();
