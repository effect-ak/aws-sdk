# AWS SDK Effect Generator

A code generation tool that creates Effect-TS wrappers for AWS SDK v3 client libraries.

**Looking for high-level AWS workflows?** Check out [@effect-ak/aws-services](../services/) which provides Effect-first abstractions for common AWS patterns built on top of this generator.

## Features

- **Effect-wrapped AWS operations** - All AWS SDK commands as Effect functions
- **Type-safe error handling** - Strongly-typed error classes with command-specific type guards
- **Effect-TS integration** - Native Context/Layer/Service patterns
- **Automatic tracing** - Built-in `Effect.fn` spans for observability
- **Auto-detection** - Automatically discovers AWS SDK clients from package.json

For detailed technical information, see [How It Works](docs/how-it-works.md).

## Installation

```bash
npm install @effect-ak/aws-sdk
# or
pnpm add @effect-ak/aws-sdk
```

## Quick Start

### Configuration

Create an `aws-sdk.json` file in your project root:

```json
{
  "$schema": "./node_modules/@effect-ak/aws-sdk/schema.json",
  "generate_to": "src/clients",
  "clients": ["s3", "ssm", "dynamodb"],
  "global": {
    "region": "us-east-1"
  }
}
```

All fields are optional:
- `generate_to` - Output directory (default: `"src/generated"`)
- `clients` - List of AWS clients to generate (default: auto-detected from package.json dependencies)
- `global.region` - Default region injected into all client constructors (optional)

### Running the Generator

#### Manual Generation

```bash
npx gen-aws-sdk
```

Or from your package scripts:

```bash
pnpm gen-aws-sdk
```

#### Automatic Generation

Add the generator to your `package.json` scripts for automatic code generation:

**Option 1: Pre-build hook (Recommended)**

```json
{
  "scripts": {
    "gen": "gen-aws-sdk",
    "prebuild": "pnpm gen",
    "build": "tsup"
  },
  "devDependencies": {
    "@effect-ak/aws-sdk": "^1.0.0"
  }
}
```

The generator will run automatically before every build. Useful for ensuring generated code is always up-to-date.

**Option 2: Post-install hook**

```json
{
  "scripts": {
    "postinstall": "gen-aws-sdk"
  }
}
```

The generator runs after `npm install` / `pnpm install`. Useful for CI/CD and onboarding new developers.

**Option 3: Separate command**

```json
{
  "scripts": {
    "gen": "gen-aws-sdk"
  }
}
```

Run manually when needed: `pnpm gen`. Gives you full control over when generation happens.

**Note:** The generator automatically detects AWS SDK clients from your `package.json` dependencies. You only need to specify `clients` in `aws-sdk.json` if you want to generate a subset of your installed clients.

### Using Generated Code

#### Basic Usage

```typescript
import { Effect } from "effect";
import { s3 } from "@effect-ak/aws-sdk";

const program = Effect.gen(function* () {
  // Create bucket
  const result = yield* s3.make("create_bucket", {
    Bucket: "my-bucket"
  });

  return result;
}).pipe(
  Effect.catchIf(
    _ => _.$is("BucketAlreadyExists"),  // Command-specific error
    () => Effect.succeed("Bucket exists")
  ),
  Effect.provide(s3.S3Client.Default())
);
```

#### Using Multiple Clients with AllClientsDefault

```typescript
import { Effect } from "effect";
import { s3, ssm, AllClientsDefault } from "@effect-ak/aws-sdk";

const program = Effect.gen(function* () {
  yield* s3.make("create_bucket", { Bucket: "my-bucket" });
  yield* ssm.make("put_parameter", {
    Name: "/my/param",
    Value: "value"
  });
}).pipe(Effect.provide(AllClientsDefault));
```

#### Custom Client Configuration

```typescript
import { Effect } from "effect";
import { s3, ssm, makeClients } from "@effect-ak/aws-sdk";

const program = Effect.gen(function* () {
  yield* s3.make("list_buckets", {});
  yield* ssm.make("get_parameter", { Name: "/test" });
}).pipe(
  Effect.provide(makeClients({
    s3: { region: "us-west-2" },
    ssm: { region: "eu-central-1" }
  }))
);
```

### Error Handling

```typescript
// Command-specific error (autocomplete shows only CreateBucket errors)
Effect.catchIf(_ => _.$is("BucketAlreadyExists"), ...)

// Global error check (any S3 error)
Effect.catchIf(_ => _.is("NoSuchBucket"), ...)

// Catch all errors from a specific command
Effect.catchTag("S3Error", (error) => {
  if (error.command === "create_bucket") {
    // Handle create_bucket errors
  }
})
```

## Documentation

- [How It Works](docs/how-it-works.md) - Detailed technical documentation about the generator architecture, code generation process, and design decisions
