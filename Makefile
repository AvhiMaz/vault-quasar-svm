.PHONY: build so test svm

build:
	cargo build

so:
	cargo build-sbf

test:
	cargo test

quasar-svm:
	npm test

all:
	make so && make quasar-svm
