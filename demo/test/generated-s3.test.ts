import { describe, it, expect } from "vitest";
import { Project } from "ts-morph";
import path from "path";

describe("generated s3 client", () => {

  const project = new Project();
  const sourceFile = project.addSourceFileAtPath(path.resolve(__dirname, "../src/effect-aws-sdk/s3.ts"));
  const content = sourceFile.getFullText();

  it("exports S3Client class with Default method", () => {
    const s3Client = sourceFile.getClass("S3Client");
    expect(s3Client).toBeDefined();
    expect(s3Client?.isExported()).toBe(true);
    expect(content).toContain("static Default");
  });

  it("exports s3 function", () => {
    const s3Fn = sourceFile.getVariableDeclaration("s3");
    expect(s3Fn).toBeDefined();
    expect(s3Fn?.isExported()).toBe(true);
  });

  it("exports S3Error class with _tag and is method", () => {
    const s3Error = sourceFile.getClass("S3Error");
    expect(s3Error).toBeDefined();
    expect(s3Error?.isExported()).toBe(true);

    const tagProp = s3Error?.getProperty("_tag");
    expect(tagProp).toBeDefined();

    const isMethod = s3Error?.getMethod("is");
    expect(isMethod).toBeDefined();
  });

  it("exports S3Api type with commands", () => {
    const s3Api = sourceFile.getTypeAlias("S3Api");
    expect(s3Api).toBeDefined();
    expect(s3Api?.isExported()).toBe(true);

    // проверяем через исходный текст типа
    const typeText = s3Api?.getText() ?? "";
    expect(typeText).toContain("put_object");
    expect(typeText).toContain("get_object");
    expect(typeText).toContain("list_buckets");
  });

  it("exports S3CommandFactory", () => {
    const factory = sourceFile.getVariableDeclaration("S3CommandFactory");
    expect(factory).toBeDefined();
    expect(factory?.isExported()).toBe(true);

    const factoryText = factory?.getText() ?? "";
    expect(factoryText).toContain("put_object: PutObjectCommand");
    expect(factoryText).toContain("get_object: GetObjectCommand");
  });

  it("imports commands from @aws-sdk/client-s3", () => {
    const imports = sourceFile.getImportDeclarations();
    const sdkImports = imports.filter(i => i.getModuleSpecifierValue() === "@aws-sdk/client-s3");
    expect(sdkImports.length).toBeGreaterThan(0);

    // проверяем что есть импорт команд
    expect(content).toContain("PutObjectCommand");
    expect(content).toContain("GetObjectCommand");
    expect(content).toContain("S3Client as _SdkClient");
  });

});
