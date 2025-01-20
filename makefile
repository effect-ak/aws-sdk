build:
	tsup
	tsx ./scripts/prep.ts

gen:
	tsx ./src/bin/generate.ts

publish:
	make build
	pnpm publish