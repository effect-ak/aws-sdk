import { describe, it, expect, beforeAll } from "vitest";
import { Effect, Logger } from "effect";
import { type Project } from "ts-morph";
import { WriteService } from "~/write";
import { ScannedSdk } from "~/scan";
import path from "path";

const genRoot = path.resolve(__dirname, "..");

let project: Project;

describe("generate s3 client", () => {

  beforeAll(async () => {
    const prevCwd = process.cwd();
    process.chdir(genRoot);

    project = await Effect.gen(function* () {
      const ws = yield* WriteService;
      const scannedSdk = yield* ScannedSdk.fromNodeModules("s3");
      yield* ws.writeInternalUtils;
      yield* ws.writeCode(scannedSdk);
      yield* ws.writeIndex([scannedSdk]);
      return ws.project;
    }).pipe(
      Effect.provide(WriteService.Default),
      Effect.provide(Logger.pretty),
      Effect.runPromise
    );

    process.chdir(prevCwd);
  });

  const getSourceFile = (name: string) =>
    project.getSourceFileOrThrow(f =>
      f.getFilePath().endsWith(`/${name}`)
    );

  it("exports S3Client class with Default method", () => {
    const sourceFile = getSourceFile("s3.ts");
    const s3Client = sourceFile.getClass("S3Client");
    expect(s3Client).toBeDefined();
    expect(s3Client?.isExported()).toBe(true);
    expect(sourceFile.getFullText()).toContain("static Default");
  });

  it("exports make function", () => {
    const sourceFile = getSourceFile("s3.ts");
    const makeFn = sourceFile.getVariableDeclaration("make");
    expect(makeFn).toBeDefined();
    expect(makeFn?.isExported()).toBe(true);
  });

  it("exports S3Error class with _tag and is method", () => {
    const sourceFile = getSourceFile("s3.ts");
    const s3Error = sourceFile.getClass("S3Error");
    expect(s3Error).toBeDefined();
    expect(s3Error?.isExported()).toBe(true);

    const tagProp = s3Error?.getProperty("_tag");
    expect(tagProp).toBeDefined();

    const isMethod = s3Error?.getMethod("is");
    expect(isMethod).toBeDefined();
  });

  it("exports S3Api type with commands", () => {
    const sourceFile = getSourceFile("s3.ts");
    const s3Api = sourceFile.getTypeAlias("S3Api");
    expect(s3Api).toBeDefined();

    const typeText = s3Api?.getText() ?? "";
    expect(typeText).toContain("put_object");
    expect(typeText).toContain("get_object");
    expect(typeText).toContain("list_buckets");
  });

  it("exports S3CommandFactory", () => {
    const sourceFile = getSourceFile("s3.ts");
    const factory = sourceFile.getVariableDeclaration("S3CommandFactory");
    expect(factory).toBeDefined();

    const factoryText = factory?.getText() ?? "";
    expect(factoryText).toContain("put_object: Sdk.PutObjectCommand");
    expect(factoryText).toContain("get_object: Sdk.GetObjectCommand");
  });

  it("imports from @aws-sdk/client-s3", () => {
    const sourceFile = getSourceFile("s3.ts");
    const imports = sourceFile.getImportDeclarations();
    const sdkImports = imports.filter(i => i.getModuleSpecifierValue() === "@aws-sdk/client-s3");
    expect(sdkImports.length).toBeGreaterThan(0);
    expect(sdkImports[0].getNamespaceImport()?.getText()).toBe("Sdk");
  });

  it("generates index.ts with exports", () => {
    const indexFile = getSourceFile("index.ts");
    const content = indexFile.getFullText();
    expect(content).toContain("AllClientsDefault");
    expect(content).toContain("makeClients");
  });

  it("generates internal/utils.ts", () => {
    const utilsFile = getSourceFile("utils.ts");
    const content = utilsFile.getFullText();
    expect(content).toContain("AllErrors");
  });

});
