.PHONY: build so test svm

build:
	cargo build

so:
	cargo build-sbf

test:
	cargo test

npm:
	npm test
